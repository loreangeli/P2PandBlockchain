// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;
pragma experimental ABIEncoderV2;

import {MT} from "./MT.sol";
import "./SafeMath.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract BattleShips {
    using SafeMath for uint;

    address creator; //creator of the smart contract
    uint id; //is a variable that contains the last id associated with a game, also indicate the battleships array size
    uint nextBlock; //fake variable just to move to the next block

    //describe a battleship single game
    struct BattleShip {
        uint id; //unique identifier of the game
        uint n; //matrix n*n 
        uint state; //state: {0: both players not joined the match (waiting for the opposing player); 1: if I'm in this state it means that the second player entered the game (propose-stake); 2: stake is set (players have to set root); 3: players have set their own merkle tree root (player have to pay); 4: players have paid the stake; 5: verify winner; 6: pay winner (final state)}
        uint turn; //0: turn of p1, 1: turn of p2
        address p1; //player1 public address
        address p2; //player2 public address
        uint stake_p1; //stake proposal player1
        uint stake_p2; //stake proposal player2
        uint stake_lock; //{0: it is up to player1 to propose the stake; 1: it is up to player2 to propose the figure; 2: stake decided (an agreement was found for the stake)}
        bytes32 root_p1; //Merkle Tree root player1
        bytes32 root_p2; //Merklet Tree root player2
        uint balance; //balance in wei of the game
        address winner;
    }

    //I use this structure to count boats that have been hit by torpedo
    struct ShipSunk {
        uint id; //identifier of the game
        uint ss_p1; //number of piece of ships sunk
        uint ss_p2; //number of piece of ships sunk
    }

    //maintains information about players' stake payments prior to the launch torpedo phase
    struct InfoStake {
        uint id; //identifier of the game
        bool p1_paid; //if the player1 has deposited the money on the smart contract it is true, otherwise false
        bool p2_paid; //if the player2 has deposited the money on the smart contract it is true, otherwise false
    }

    //struct used in a mapping (mapping(uint => Torpedo[]) private torpedo)
    struct Torpedo {
        uint x;
        uint y;
        uint player; //0: torpedo launched by player1, 1: torpedo launched by player2
        bool verify; //check if this torpedo is verified or not; if it is false it means that I have yet to verify it and that is that the player must call the "reply_torpedo" to tell if it is a miss/hit, otherwise it means that he has already done this operation.
        uint result; //miss: 0, hit: 1, not set: 2
    }

    //struct used in a mapping (mapping(uint => Accuse) private accuse), if i accuse a player of leaving the game
    struct Accuse {
        bool accused; //if true the player is accused, otherwise false.
        uint blocknumber; //when the player is accused i memorize the block number
        address player; //accused player
    }

    //i count the number of times the player has attempted to cheat. After four attempts the player loses at the table.
    struct CountCheat {
        uint p1; //number of times the player1 has attempted to cheat
        uint p2; //number of times the player2 has attempted to cheat
    }

    //ARRAYS INIT
    BattleShip[] private battleships; //i store the games info in this array
    ShipSunk[] private shipsunks; // this array contains ShipSunk objects, an object refers to a particular game and contains the number of boats that have been hit by torpedo
    InfoStake[] private infostakes;

    //MAPPINGS INIT
    mapping(uint => Torpedo[]) private torpedo; //map(id_game => array of Torpedo), passing it the id of the game, an array containing all the torpedoes launched by both players up to that moment is returned.
    mapping(address => bool) private players; //map(address player => true/false), if the address of a player is playing a game the result is true, otherwise is false.
    mapping(uint => bool) private game_id; //map(id_game => true/false), if the id argument correspond to a game the result is true ((a finished game or a game in progress), otherwise is false.
    mapping(uint => Accuse) private accuse; //map(id_game => Accuse), keeps information about the accusing player
    mapping (uint => CountCheat) private countcheat; //map(id_game => CountCheat)
    /* 
    if the value is true and turn=0 (game turn variable) player 2 must make the reply_torpedo, 
    if the value is true and turn=1 player 1 must make the reply_torpedo, 
    if the value is false and turn=0 the player 1 must launch_torpedo, 
    if value is false and turn=1 player 2 must launch_torpedo.
    brief: if reply=true it's time for reply_torpedo, if reply=false it's time for launch_torpedo.
    */
    mapping (uint => bool) private reply; //map(id_game => true/false): I use this map together with the turn variable to handle game turns correctly.

    //EVENTS
    event NGame(uint id, uint n, address game_creator); //player1 created the game
    event StartGame(uint id, uint n, address p1, address p2, uint code); //code=0: player2 has joined the game; code=1: the id does not match any game
    event ProposeStake(uint stake, uint id, address p, address r); //p: player that had proposed stake, r: player that had receive proposed
    event StakeDecided(uint id, uint stake_value, address p1, address p2, uint n); //p1: player in the game (player1), p2: other player in the game (player2)
    event PlayerSetRoot(uint id, address p, bytes32 root); //player p set the root
    event RootSet(uint id, address p1, address p2); //both roots have been set by player1 and player2; p1: player1 of the game, p2: player2 of the game
    event TransferWei(uint id, address p1, address p2, uint n); //both players have deposited Wei on the smart contract
    event LaunchTorpedo(uint id, uint x, uint y, address p1, address p2, uint turn); //p1: player that had launch a torpedo, p2: player that had receive a torpedo
    event ReplyTorpedo(uint id, uint x, uint y, address p, string result); //result={"0", "1"} where 0 is miss and 1 is hit
    event VerifyWin(uint id, address winner, address loser); //if this event is launched it means that we have to verify the victory
    event isWinner(uint id, address winner, uint reward); //if the event is launched it means that we have a winner and the game is therefore over
    event Cheat(uint id, address p, uint code); //[code=0] cheat attempt(id, cheater, 0); [code=1] accuse player(id, accused, 1)
    event WinForCheat(uint id, address winner, address loser); //event in case i lost forfeit (nel caso abbia perso a tavolino);
    event CheatWin(uint id, address cheater); //the game is over but the control of the board seems to be incorrect, I then make the opponent win
    event WinforLeaving(uint id, address winner, address loser); //the player won after accusing the other player of quitting the game

    //MODIFIERS
    //modifier for game_id
    function _gameId(uint _id) private view {
        require(game_id[_id]);
    }
    modifier gameId(uint _id) {
        _gameId(_id);
        _;
    }
    //modifier for check players: check if msg.sender is playing the game with id _id
    function _check_player(uint _id) private view {
        require((battleships[_id].p1 == msg.sender) || (battleships[_id].p2 == msg.sender));
    }
    modifier check_player(uint _id) {
        _check_player(_id);
        _;
    }
    //modifier for check_game_player: it prevents a player from being able to play several games at the same time.
    function _check_game_player() private view {
        require(players[msg.sender] == false);
    }
    modifier check_game_player() {
        _check_game_player();
        _;
    }
    //modifier
    function _check_stake(uint _id) private view {
        require(infostakes[_id].p1_paid == false || infostakes[_id].p2_paid == false);
    }
    modifier check_stake(uint _id) {
        _check_stake(_id);
        _;
    }
    //modifier
    function _check_state(uint _id, uint state) private view {
        require (battleships[_id].state == state);
    }
    modifier check_state(uint _id, uint state) {
        _check_state(_id, state);
        _;
    }
    //modifier
    function _check_stake_lock(uint _id) private view {
        require (battleships[_id].stake_lock == 2);
    }
    modifier check_stake_lock(uint _id) {
        _check_stake_lock(_id);
        _;
    }

    //constructor
    constructor () {
        creator = msg.sender;
        id = 0;
        nextBlock = 0;
    }

    function getBalance() external view returns(uint) {
            return address(this).balance;
    }

    function get_totalships (uint n) private pure returns (uint) {
        require(n>0 && n%2==0 && n<=10);
        if (n==2) return 1;
        if (n==4) return 4;
        if (n==6) return 10;
        if (n==8) return 13;
        return 16; //n=10
    }

    //function I use to generate the id to assign to the game
    function generate_id() private returns (uint) {
        uint _id = id;

        while (true) {
            if (game_id[_id]) //this id exist into the mapping
                _id=_id+1;
            else {
                id = _id;
                game_id[id]=true;
                return id;
            }
        }

        return 0;
    }

    //GET METHODS
    function get_n_battleship(uint _id) public view returns (int) {
        if (game_id[_id] == false) 
            return -1;
            
        return int(battleships[_id].n);
    }

    function get_state_battleship(uint _id) public view returns (int) {
        if (game_id[_id] == false) 
            return -1;

        return int(battleships[_id].state);
    }

    function get_turn(uint _id) public view returns (int) {
        if (game_id[_id] == false) 
            return -1;

        return int(battleships[_id].turn);
    }

    function get_reply(uint _id) public view returns (bool) {
        return reply[_id];
    }

    function get_player1_battleship(uint _id) public view returns (address) {
        if (game_id[_id] == false) 
            return address(0);

        return battleships[_id].p1;
    }

    function get_player2_battleship(uint _id) public view returns (address) {
        if (game_id[_id] == false) 
            return address(0);

        return battleships[_id].p2;
    }

    function get_stake_player(uint _id) public check_player(_id) view returns (int) {
        if (game_id[_id] == false) 
            return -1;
        if (msg.sender == battleships[_id].p1) 
            return int(battleships[_id].stake_p1);

        return int(battleships[_id].stake_p2);
    }

    function get_stake_lock(uint _id) public view returns (int) {
        if (game_id[_id] == false) 
            return -1;

        return int(battleships[_id].stake_lock);
    }

    function get_root_player(uint _id) public gameId(_id) check_player(_id) view returns (bytes32) {
        if (msg.sender == battleships[_id].p1) 
            return battleships[_id].root_p1;

        return battleships[_id].root_p2;
    }

    //check if the player is currently playing in a match, if he is playing a game the gameid is returned, -1 otherwise
    function get_id_player() public view returns (int){
        for (uint i=0;i<battleships.length;i++) {
            if (battleships[i].p1 == msg.sender && battleships[i].state != 6)
                return int(battleships[i].id);
            else if (battleships[i].p2 == msg.sender && battleships[i].state != 6)
                return int(battleships[i].id);
        }

        return -1;
    }

    //METHODS

    //function used to create a new block on Ganache and simulate victory by forfeit
    function next_block() external {
        nextBlock++;
    }

    /*
    @ comments: this method is used to create a new game
    @ args: n is the number of row/columns on the board (that is a nxn matrix)
    @ return: id of the new game created
    */
    function new_game(uint n) public check_game_player() returns (uint) {
        require(n>1 && n<=10 && (n%2==0));
        players[msg.sender] = true;
        uint _id = generate_id();
        battleships.push(BattleShip(_id, n, 0, 0, msg.sender, address(0), 0, 0, 0, "", "", 0, address(0)));
        shipsunks.push(ShipSunk(_id, 0, 0));
        infostakes.push(InfoStake(_id, false, false));
        reply[_id] = false;
        emit NGame(_id, n, msg.sender);
        return _id; 
    }

    /*
    @ comments: join a game with a random opponent
    @ args: nothing
    @ return: id of the game if the player finds an available game, otherwise -1
    */
    function join_casual_game() public check_game_player() returns (int){  
        for (uint i=0; i<battleships.length;i++) { //search available game 
            if ( (battleships[i].p2==address(0)) && (battleships[i].p1!=msg.sender) ) {
                battleships[i].p2=msg.sender;
                battleships[i].state = 1;
                emit StartGame(i, battleships[i].n, battleships[i].p1, battleships[i].p2, 0);
                players[msg.sender] = true;
                return int(i);
            }
        }
        return -1;
    }

    /*
    @ comments: join the newly-created game with id of the game (play with a friend)
    @ args: _id is the id of the game
    @ return: true if this id game is an available game, otherwise false
    */
    function join_game(uint _id) public check_game_player() returns (bool){
        require(battleships[_id].p2 == address(0));
        if (game_id[_id]) { //check if the id correspond to a game
            if (battleships[_id].p1 != msg.sender && battleships[_id].p2==address(0)) {
                battleships[_id].p2=msg.sender;
                battleships[_id].state = 1;
                emit StartGame(id, battleships[_id].n, battleships[_id].p1, battleships[_id].p2, 0);
                players[msg.sender] = true;
                return true;
            }
        }
        emit StartGame(id, 0, msg.sender, address(0), 1); //can't start game
        return false;
    }

    /*
    @ comments: this method is used to propose a stake value, player 1 starts proposing the stake value, 
    then it will be player 2's turn and so on until both players set the same stake value.
    @ args: _id is the id of the game, stakevalue is the value that i propose to the other player
    @ return: nothing
    */
    function propose_stake(uint _id, uint stakevalue) public gameId(_id) check_player(_id) check_state(_id, 1) {
        //player1
        if ((battleships[_id].p1 == msg.sender) && battleships[_id].stake_lock == 0) {
            battleships[_id].stake_p1 = stakevalue;
            if (battleships[_id].stake_p1 == battleships[_id].stake_p2) {
                battleships[_id].stake_lock = 2;
                battleships[_id].state = 2;
                emit StakeDecided(_id, stakevalue, msg.sender, battleships[_id].p2, battleships[_id].n);
                return;
            }
            battleships[_id].stake_lock = 1;
            emit ProposeStake(stakevalue, _id, msg.sender, battleships[_id].p2);
        }
        //player2
        if (battleships[_id].p2 == msg.sender && battleships[_id].stake_lock == 1) {
            battleships[_id].stake_p2 = stakevalue;
            if (battleships[_id].stake_p1 == battleships[_id].stake_p2) {
                battleships[_id].stake_lock = 2;
                battleships[_id].state = 2;
                emit StakeDecided(_id, stakevalue, msg.sender, battleships[_id].p1, battleships[_id].n);
                return;
            }
            battleships[_id].stake_lock = 0;
            emit ProposeStake(stakevalue, _id, msg.sender, battleships[_id].p1);
        }
    }

    /*
    @ comments: this method is used to set the root of merkle tree of player1 and player2
    @ args: _id is the id of the game, board contains the display board represented on the
    array where the value is -1 if there is no boat in the cell or a value >=0 if there
    is a boat. The random_board matrix contains the random salts, to be concatenated with 
    the elements of the board matrix.
    @ return: nothing
    */
    function set_root(uint _id, int[] memory board, uint[] memory random_board) public gameId(_id) check_player(_id) check_state(_id, 2) {
        require( board.length == ((battleships[_id].n)*(battleships[_id].n)) );
        require(( random_board).length == (battleships[_id].n)*(battleships[_id].n) );
        //check that you have entered all the ships
        uint count_ship=0;
        for (uint i=0;i<board.length;i++) {
            if (board[i] != -1) count_ship++;
        }
        require(count_ship == MT.get_totalships(battleships[_id].n), "invalid board size");
        require(MT.check_ships(board, battleships[_id].n), "check_ships_error");

        if (battleships[_id].p1 == msg.sender) { //i'm player1
            battleships[_id].root_p1 = MT.calculateRoot(board, random_board);
            emit PlayerSetRoot(_id, msg.sender, battleships[_id].root_p1);
        }
        else { //i'm player2
            battleships[_id].root_p2 = MT.calculateRoot(board, random_board);
            emit PlayerSetRoot(_id, msg.sender, battleships[_id].root_p2);
        }

        if (battleships[_id].root_p1 != "" && battleships[_id].root_p2 != "") {
            battleships[_id].state = 3;
            emit RootSet(_id, battleships[_id].p1, battleships[_id].p2);
        }
    }


    /*
    @ comments: method used by the players to send wei to the contract after an agreement has been found between the players (send wei to Contract)
    @ args: _id is the id of the game
    @ return: nothing
    */
    function transfer_wei(uint _id) public gameId(_id) check_player(_id) check_stake(_id) check_stake_lock(_id) payable {
        require( (msg.sender == battleships[_id].p1 && infostakes[_id].p1_paid == false) || (msg.sender == battleships[_id].p2 && infostakes[_id].p2_paid == false)); //check if I have already paid (avoid double spending)
        
        if (msg.sender == battleships[_id].p1) { //i'm player1
            require(msg.value == battleships[_id].stake_p1);
            infostakes[_id].p1_paid = true;
        }
        if (msg.sender == battleships[_id].p2) { //i'm player2
            require(msg.value == battleships[_id].stake_p2);
            infostakes[_id].p2_paid = true;
        }
        if (infostakes[_id].p1_paid == true && infostakes[_id].p2_paid == true) {
            battleships[_id].state = 4;
            battleships[_id].balance = battleships[_id].stake_p1.add(battleships[_id].stake_p2);
            emit TransferWei(id, battleships[_id].p1, battleships[_id].p2, battleships[_id].n);
        }
    }

    /*
    @ comments: in case i deposited the wei but the second player not yet, I can withdraw the deposited wei with this method.
    @ args: _id is the id of the game
    @ return: nothing
    */
    function recover_wei(uint _id) public gameId(_id) check_player(_id) check_stake(_id) check_state(_id, 3) check_stake_lock(_id) {
        //refund player 
        if (msg.sender == battleships[_id].p1 && infostakes[_id].p1_paid == true) { //i'm player1
            infostakes[_id].p1_paid = false;
            payable(msg.sender).transfer(uint(battleships[_id].stake_p1));
            return;
        }
        if (msg.sender == battleships[_id].p2 && infostakes[_id].p2_paid == true) { //i'm player2
            infostakes[_id].p2_paid = false;
            payable(msg.sender).transfer(uint(battleships[_id].stake_p2));
            return;
        }
    }

    /*
    @ comments: with this method I can throw a torpedo at the opposing player
    @ args: _id is the id of the game, x is the abscissa index, y is the ordinate index
    @ return: true if the torpedo was successfully launched, false if you had already launched the same torpedo previously
    */
    function launch_torpedo(uint _id, uint x, uint y) public gameId(_id) check_player(_id) returns (bool) {
        require(battleships[_id].state == 4);
        require (x<battleships[_id].n && y<battleships[_id].n);
        //check if is my turn
        if (battleships[_id].p1 == msg.sender && battleships[_id].turn == 1) //i'm player1
            return false;
        if (battleships[_id].p2 == msg.sender && battleships[_id].turn == 0) //i'm player2
            return false;
        if (reply[_id] == true) //it's time for the reply torpedo
            return false;

        //check if the other player accused me
        if (accuse[_id].accused == true && msg.sender == accuse[_id].player) {//I was accused of leaving the game
            //check that i have passed the 5 blocks
            uint blocknumber_now = block.number;

            if ((blocknumber_now.sub(accuse[_id].blocknumber)) <= 5) { //I'm in time to continue the game
                accuse[_id].accused = false;
                accuse[_id].blocknumber = 0;
                accuse[_id].player = address(0);
            }
            else { //i can't play anymore, I lost by forfeit (a tavolino)
                address winner = (battleships[_id].p1 == msg.sender ?  battleships[_id].p2 : battleships[_id].p1);
                address loser = (battleships[_id].p1 == msg.sender ?  battleships[_id].p1 : battleships[_id].p2);
                //reward the opponent
                payable(winner).transfer(uint(battleships[_id].balance));
                set_winner(_id, winner, loser);
                emit WinForCheat(_id, winner, loser);
                return false;
            }
        }

        //set player variable
        uint player = (battleships[_id].p1 == msg.sender ? 0 : 1);

        //check if i already have launch this particular torpedo
        Torpedo [] storage tmp = torpedo[_id];
        for (int i=0;uint(i)<tmp.length;i++) {
            if (tmp[uint(i)].x == x && tmp[uint(i)].y == y && player == tmp[uint(i)].player) //the third condition checks whether I launched that particular torpedo
                return false;
        }
        //if I got to this point I'm sure I've never launched this particular torpedo
        tmp.push(Torpedo(x, y, player, false, 2));
        
        torpedo[_id] = tmp; //update torpedo map

        if (msg.sender == battleships[_id].p1) //i'm player1
            emit LaunchTorpedo(_id, x, y, msg.sender, battleships[_id].p2, battleships[_id].turn);
        else //i'm player2
            emit LaunchTorpedo(_id, x, y, msg.sender, battleships[_id].p1, battleships[_id].turn);

        reply[_id] = true; //set reply_torpedo moment

        return true;
    }

    /*
    @ comments: with this method I can do a reply torpedo at the opposing player
    @ args: _id is the id of the game, result is {"0": miss, "1": hit}, randvalue
    is the random value of the initial concatenation (when i built the merkle root), 
    x is the abscissa index, y is the ordinate index, proof is the proof to ensure 
    that i have not cheated, positions is an array that contain the positions of proof leaf (0: left leaf, 1: right leaf)
    @ return: nothing
    */
    function reply_torpedo(uint _id, string memory result, string memory randvalue, uint x, uint y,  bytes32[] memory proof, uint256[] memory positions) public gameId(_id) {
        require(battleships[_id].state == 4, "state_error");
        require (MT.compareStrings(result, '0') || MT.compareStrings(result, '1'), "result_error");
        require(battleships[_id].p1 == msg.sender || battleships[_id].p2 == msg.sender, "address_error");

        bytes32 root;
        {
            root = (battleships[_id].p1 == msg.sender ? battleships[_id].root_p1 : battleships[_id].root_p2);
        }
         
        uint player;
        
        {
            player = (battleships[_id].p1 == msg.sender ? 0 : 1);
        }

        //check turn
        if (reply[_id] == false)
            return;

        //if it's player 1 (or 2)'s turn and i'm player 1 (or 2) i can't call the reply
        if (battleships[_id].turn == player)
            return;

        //check if the other player accused me
        if (accuse[_id].accused == true && msg.sender == accuse[_id].player) {//I was accused of leaving the game
            //check that i have passed the 5 blocks
            uint blocknumber_now = block.number;

            if ((blocknumber_now.sub(accuse[_id].blocknumber)) <= 5) { //I'm in time to continue the game
                accuse[_id].accused = false;
                accuse[_id].blocknumber = 0;
                accuse[_id].player = address(0);
            }
            else { //i can't play anymore, I lost by forfeit (a tavolino)
                address winner = (battleships[_id].p1 == msg.sender ?  battleships[_id].p2 : battleships[_id].p1);
                address loser = (battleships[_id].p1 == msg.sender ?  battleships[_id].p1 : battleships[_id].p2);
                //reward the opponent
                payable(winner).transfer(uint(battleships[_id].balance));
                set_winner(_id, winner, loser);
                emit WinForCheat(_id, winner, loser);
                return;
            }
        }

        //I have to check that player 1 has launched the torpedo and that it's my turn to do the reply
        Torpedo [] storage tmp = torpedo[_id];
        if (tmp.length==0) //no torpedoes were launched
            return;
        if (tmp[tmp.length-1].verify == true) //I've already checked the torpedo and it's now my turn to do launch_torpedo
            return;

        //if i'm here i have to check the torpedo
        if (MT.verify(root, keccak256(abi.encodePacked(result, randvalue)), proof, positions)) { //proof verified correctly
            tmp[tmp.length-1].verify = true;
            tmp[tmp.length-1].result = (MT.compareStrings(result, '0') ? 0 : 1);
            torpedo[_id] = tmp; //update torpedo map

            //change turn
            battleships[_id].turn = (battleships[_id].turn == 0 ? 1 : 0);
            reply[_id] = false;

            if (player == 0){  //i'm player1
                if (MT.compareStrings(result, '1')) {
                    shipsunks[_id].ss_p2++; //update number of ship sunks
                }
            }
            else { //i'm player 2
                if (MT.compareStrings(result, '1')) {
                    shipsunks[_id].ss_p1++; //update number of ship sunks
                }
            }
            //check if one of the two players has won
            if (get_totalships(battleships[_id].n)==shipsunks[_id].ss_p1) {
                battleships[_id].state = 5;
                battleships[_id].winner = battleships[_id].p1; 
                emit VerifyWin(_id, battleships[_id].p1, battleships[_id].p2);
                return;
            }
            if (get_totalships(battleships[_id].n)==shipsunks[_id].ss_p2) {
                battleships[_id].state = 5;
                battleships[_id].winner = battleships[_id].p2;
                emit VerifyWin(_id, battleships[_id].p2, battleships[_id].p1);
                return;
            }

            emit ReplyTorpedo(_id, x, y, msg.sender, result);
        }
        else { //cheat attempt
            CountCheat memory cc = countcheat[_id];
            if (player == 0) cc.p1++;
            else cc.p2++;
            countcheat[_id] = cc;
            emit Cheat(_id, msg.sender, 0);
            
            //I tried to cheat too many times, i lost at forfeit.
            if ((player == 0 && cc.p1 > 4) || (player == 1 && cc.p2 > 4)) { 
                address winner;
                address loser;
                if (battleships[_id].p1 == msg.sender) {//i'm player1
                    winner = battleships[_id].p2;
                    loser = battleships[_id].p1;
                }
                if (battleships[_id].p2 == msg.sender) {//i'm player2
                    winner = battleships[_id].p1;
                    loser = battleships[_id].p2;
                }
                
                //reward the opponent
                uint balance;
                {
                    balance = battleships[_id].balance;
                }
                payable(winner).transfer(uint(balance));
                set_winner(_id, winner, loser);
                emit WinForCheat(_id, winner, loser);
            } 
        }

        return;
    }

    /*
    @ comments: it is a private method used to set some variables in case of victory of the player
    @ args: _id is the id of the game, p1 is the address of player1, p2 is the address of player2
    @ return: nothing
    */
    function set_winner(uint _id, address p1, address p2) private {
        battleships[_id].state = 6;
        //players can join a new game
        players[p1] = false;
        players[p2] = false;
        battleships[_id].balance = 0;
    }

    /*
    @ comments: this method if called by the player who lost the game has no effect. Alternatively,
    if called by the player who has won, it re-checks the matrix passed by argument comparing it with
    the torpedoes received to verify whether up to that moment the player had expressed the truth or not.
    In case he cheated, the stake is sent to the other player.
    @ args: _id is the id of the game, board is the matrix that contain 1 if the ship compare on this particular cell, 0 otherwise
    @ return: nothing
    */
    function verify_winner(uint _id, int [] memory board) public gameId(_id) check_state(_id, 5) {
        if (msg.sender !=  battleships[_id].winner)
            return;

        require(board.length == uint( (battleships[_id].n) * (battleships[_id].n) ));
        uint player;
        if (msg.sender == battleships[_id].winner) player = 0; else player = 1;
        address loser = (msg.sender == battleships[_id].p1 ? battleships[_id].p2 : battleships[_id].p1);

        //check that the boats on the matrix board are the ones that I saved by torpedo (si controlla che le barche sulla matrice board siano quelle che ho salvato in torpedo)
        Torpedo [] storage tmp = torpedo[_id];

        for (uint i=0;i<tmp.length;i++) {
            if (tmp[i].player == player){ //check the torpedo of the winner
                if (board[(tmp[i].x)+(battleships[_id].n)*(tmp[i].y)] != int(tmp[i].result)) {
                    emit CheatWin(_id, msg.sender);
                    //reward the winner
                    payable(loser).transfer(uint(battleships[_id].balance));
                    set_winner(_id, battleships[_id].p1, battleships[_id].p2);
                    return;
                }
            }
        }

        //reward the winner
        payable(msg.sender).transfer(uint(battleships[_id].balance));
        emit isWinner(_id, msg.sender, battleships[_id].balance);
        set_winner(_id, battleships[_id].p1, battleships[_id].p2);

        return;
    }

    /*
    @ comments: method invoked by the player who wants to accuse the other of having abandoned the game. 
    You cannot accuse a player twice. If i'm waiting for the other player to send me the reply_torpedo or 
    launch_torpedo i can accuse him.
    @ args: _id is the id of the game
    @ return: nothing
    */
    function accuse_adversary(uint _id) public gameId(_id) check_player(_id) check_state(_id, 4) {
        uint player = (msg.sender == battleships[_id].p1 ? 0 : 1);
        address player_accused = (msg.sender == battleships[_id].p1 ? battleships[_id].p2 : battleships[_id].p1);

        //i can't accuse a player twice
        if (accuse[_id].accused == true)
            return;
        //if it's my turn and i have to launch torpedo i can't accuse the other player
        if (battleships[_id].turn == player && reply[_id]==false) 
            return;
        /*
        if it's not my turn (battleships[_id].turn != player), but actually it's up to me (sta a me) since I have 
        to call the reply_torpedo, I must not be able to call accuse_adversary with this method!
        */
        if (battleships[_id].turn != player && reply[_id]==true)
            return;

        accuse[_id] = Accuse(true, block.number, player_accused); //set map
        emit Cheat(_id, player_accused, 1); //emit event
    }

    /*
    @ comments: method used by the accuser to obtain the entire reward. 
    @ args: _id is the id of the game
    @ return: nothing
    */
    function reward_accuser(uint _id) public gameId(_id) check_player(_id) check_state(_id, 4) {
        //check if i'm the accuser
        Accuse memory tmp = accuse[_id];
        if (tmp.accused == false || msg.sender == tmp.player)
            return;

        //check that you have passed the 5 blocks
        uint blocknumber_now = block.number;
        if ((blocknumber_now.sub(tmp.blocknumber)) > 5) { //reward the winner
            battleships[_id].winner = msg.sender;
            address loser = (msg.sender == battleships[_id].p1 ? battleships[_id].p2 : battleships[_id].p1);
            payable(msg.sender).transfer(uint(battleships[_id].balance));
            emit WinforLeaving(_id, msg.sender, loser);
            set_winner(_id, battleships[_id].p1, battleships[_id].p2);
        }
        return;
    }   

}