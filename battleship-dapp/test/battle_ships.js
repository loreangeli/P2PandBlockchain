const mylib = require('./mylib.js');
const BattleShips = artifacts.require("BattleShips");

contract("Testing BattleShips", accounts => {
  it("Test the constructor", function () {
    return BattleShips.new()
      .then(instance => {
          assert(instance);
      });
  });

  /*
    READ THIS about estimateGas: Generates and returns an estimate of how much gas is necessary to allow the transaction to complete. The transaction will not be added to the blockchain.
  */
  it("Gas Estimate with n=4", async function () {
    var n = 4;
    var player1= accounts[2];
    var player2= accounts[3];

    //getGasPrice returns the gas price on the current network
    var eth = 1000000000000000000; //1eth is 1000000000000000000 wei
    var gasPrice = await web3.eth.getGasPrice()
    console.log("Gas Price is " + gasPrice + " wei"); // "10000000000000"

    //create contract
    const instance = await BattleShips.new();

    //estimate new_game
    var gasEstimate = await instance.new_game.estimateGas(n, {from: player1});
    await instance.new_game(n, {from: player1});
    var id = await instance.get_id_player.call({from: player1});
    console.log("<new_game>");
    console.log("gas estimation = " + gasEstimate + " units");
    console.log("gas cost estimation = " + (gasEstimate * gasPrice) + " wei");
    console.log("gas cost estimation = " + ((gasEstimate * gasPrice)/eth) + " ether");

    // estimate join_game
    gasEstimate = await instance.join_game.estimateGas(Number(id), {from: player2});
    await instance.join_game(Number(id), {from: player2});
    console.log("<join_game>");
    console.log("gas estimation = " + gasEstimate + " units");
    console.log("gas cost estimation = " + (gasEstimate * gasPrice) + " wei");
    console.log("gas cost estimation = " + ((gasEstimate * gasPrice)/eth) + " ether");

    //estimate proposestake of player1
    gasEstimate = await instance.propose_stake.estimateGas(Number(id), BigInt(eth), {from: player1});
    await instance.propose_stake(Number(id), BigInt(eth), {from: player1});
    console.log("<propose_stake> (player1)");
    console.log("gas estimation = " + gasEstimate + " units");
    console.log("gas cost estimation = " + (gasEstimate * gasPrice) + " wei");
    console.log("gas cost estimation = " + ((gasEstimate * gasPrice)/eth) + " ether");

    //estimate propose stake player2
    gasEstimate = await instance.propose_stake.estimateGas(Number(id), BigInt(eth), {from: player2});
    await instance.propose_stake(Number(id), BigInt(eth), {from: player2});
    console.log("<propose_stake> (player2)");
    console.log("gas estimation = " + gasEstimate + " units");
    console.log("gas cost estimation = " + (gasEstimate * gasPrice) + " wei");
    console.log("gas cost estimation = " + ((gasEstimate * gasPrice)/eth) + " ether");

    //PLAYER1
    const M_p1_ships = [ '0', '-1', '-1', '-1',
                         '-1', '1', '-1', '-1',
                         '-1', '-1', '-1', '-1',
                         '-1', '-1', '2', '2'];
    const M_p1 = ['1', '0', '0', '0',
                  '0', '1', '0', '0',
                  '0', '0', '0', '0',
                  '0', '0', '1', '1'];

    const { MerkleTree } = require('merkletreejs')
    const keccak256 = require('keccak256');

    var random_M1 = mylib.setRandomMatrix(M_p1, n); //M_p1 contiene 0/1::random_number

    const leaves_p1 = M_p1.map(v => keccak256(v));
    const tree_p1 = new MerkleTree(leaves_p1, keccak256);
    const root_p1 = tree_p1.getHexRoot(); //root
    console.log("root_p1(js):"+root_p1);
    //set root p1
    var M_p1_ships_int = M_p1_ships.map(v => parseInt(v));
    var random_M1_int = random_M1.map(v => parseInt(v));
    gasEstimate = await instance.set_root.estimateGas(Number(id), M_p1_ships_int, random_M1_int, {from: player1});
    await instance.set_root(Number(id), M_p1_ships_int, random_M1_int, {from: player1});
    //get root p1
    ris = await instance.get_root_player.call(Number(id),{from: player1});
    console.log("root_p1(bc):"+ris);
    assert.equal(ris, root_p1, "The result should be "+root_p1);
    //compute estimation
    console.log("<set_root> (player1)");
    console.log("gas estimation = " + gasEstimate + " units");
    console.log("gas cost estimation = " + (gasEstimate * gasPrice) + " wei");
    console.log("gas cost estimation = " + ((gasEstimate * gasPrice)/eth) + " ether");

    //PLAYER2
    const M_p2_ships = [ '0', '-1', '-1', '-1',
                         '-1', '1', '-1', '-1',
                         '-1', '-1', '-1', '-1',
                         '-1', '-1', '2', '2' ];
    const M_p2 = ['1', '0', '0', '0',
                  '0', '1', '0', '0',
                  '0', '0', '0', '0',
                  '0', '0', '1', '1'];

    var random_M2 = mylib.setRandomMatrix(M_p2, n);

    const leaves_p2 = M_p2.map(v => keccak256(v));
    const tree_p2 = new MerkleTree(leaves_p2, keccak256)
    const root_p2 = tree_p2.getHexRoot();
    console.log("root_p2(js):"+root_p2);
    //set root p2
    const M_p2_ships_int = M_p2_ships.map(v => parseInt(v));
    const random_M2_int = random_M2.map(v => parseInt(v));
    gasEstimate = await instance.set_root.estimateGas(Number(id), M_p2_ships_int, random_M2_int, {from: player2});
    await instance.set_root(Number(id), M_p2_ships_int, random_M2_int, {from: player2});
    //get root p2
    ris = await instance.get_root_player.call(Number(id),{from: player2});
    console.log("root_p2(bc):"+ris);
    assert.equal(ris, root_p2, "The result should be "+root_p2);
    //compute estimation
    console.log("<set_root> (player2)");
    console.log("gas estimation = " + gasEstimate + " units");
    console.log("gas cost estimation = " + (gasEstimate * gasPrice) + " wei");
    console.log("gas cost estimation = " + ((gasEstimate * gasPrice)/eth) + " ether");

    //transfer wei player1
    gasEstimate = await instance.transfer_wei.estimateGas(Number(id), {from: player1, value: eth });
    await instance.transfer_wei(Number(id), {from: player1, value: eth });
    console.log("<transfer_wei> (player1)");
    console.log("gas estimation = " + gasEstimate + " units");
    console.log("gas cost estimation = " + (gasEstimate * gasPrice) + " wei");
    console.log("gas cost estimation = " + ((gasEstimate * gasPrice)/eth) + " ether");

    //recover wei player1
    gasEstimate = await instance.recover_wei.estimateGas(Number(id), {from: player1});
    await instance.recover_wei(Number(id), {from: player1});
    console.log("<recover_wei> (player1)");
    console.log("gas estimation = " + gasEstimate + " units");
    console.log("gas cost estimation = " + (gasEstimate * gasPrice) + " wei");
    console.log("gas cost estimation = " + ((gasEstimate * gasPrice)/eth) + " ether");

    //check if the balance of the smart contract equal to 0eth
    ris = await instance.getBalance.call();
    assert.equal(Number(ris), 0, "The result should be "+0)

    //transfer wei player1
    gasEstimate = await instance.transfer_wei.estimateGas(Number(id), {from: player1, value: eth });
    await instance.transfer_wei(Number(id), {from: player1, value: eth });
    console.log("<transfer_wei> (player1)");
    console.log("gas estimation = " + gasEstimate + " units");
    console.log("gas cost estimation = " + (gasEstimate * gasPrice) + " wei");
    console.log("gas cost estimation = " + ((gasEstimate * gasPrice)/eth) + " ether");

    //transfer wei player2
    gasEstimate = await instance.transfer_wei.estimateGas(Number(id), {from: player2, value: eth });
    await instance.transfer_wei(Number(id), {from: player2, value: eth });
    console.log("<transfer_wei> (player2)");
    console.log("gas estimation = " + gasEstimate + " units");
    console.log("gas cost estimation = " + (gasEstimate * gasPrice) + " wei");
    console.log("gas cost estimation = " + ((gasEstimate * gasPrice)/eth) + " ether");
    //check if the balance of the smart contract equal to 2eth
    ris = await instance.getBalance.call();
    assert.equal(Number(ris), 2*eth, "The result should be "+2*eth)

    //launch torpedo player1 [1]
    var x = 0;
    var y = 0;
    ris = await instance.get_state_battleship.call(Number(id));
    assert.equal(ris, 4, "The result should be "+4);
    gasEstimate = await instance.launch_torpedo.estimateGas(Number(id), x, y, {from: player1});
    await instance.launch_torpedo(Number(id), x, y, {from: player1});
    console.log("<launch_torpedo> (player1) [1]");
    console.log("gas estimation = " + gasEstimate + " units");
    console.log("gas cost estimation = " + (gasEstimate * gasPrice) + " wei");
    console.log("gas cost estimation = " + ((gasEstimate * gasPrice)/eth) + " ether");
    ris = await instance.get_state_battleship.call(Number(id));
    assert.equal(ris, 4, "The result should be "+4);

    //reply torpedo player2 [1]
    leaf = keccak256(M_p2[x+n*y])
    proof = tree_p2.getHexProof(leaf);
    var positions = tree_p2.getProof(leaf).map(x => x.position === 'right' ? 1 : 0);
    ris = await instance.get_state_battleship.call(Number(id));
    assert.equal(ris, 4, "The result should be "+4);
    gasEstimate = await instance.reply_torpedo.estimateGas(Number(id), "1", random_M2[x+n*y], x, y, proof, positions, {from: player2});
    await instance.reply_torpedo(Number(id), "1", random_M2[x+n*y], Number(x), Number(y), proof, positions, {from: player2});
    console.log("<reply_torpedo> (player2) [1]");
    console.log("gas estimation = " + gasEstimate + " units");
    console.log("gas cost estimation = " + (gasEstimate * gasPrice) + " wei");
    console.log("gas cost estimation = " + ((gasEstimate * gasPrice)/eth) + " ether");

    //launch torpedo player2 [2]
    x=1; y=0;
    gasEstimate = await instance.launch_torpedo.estimateGas(Number(id), Number(x), Number(y), {from: player2});
    await instance.launch_torpedo(Number(id), Number(x), Number(y), {from: player2});
    console.log("<launch_torpedo> (player2) [2]");
    console.log("gas estimation = " + gasEstimate + " units");
    console.log("gas cost estimation = " + (gasEstimate * gasPrice) + " wei");
    console.log("gas cost estimation = " + ((gasEstimate * gasPrice)/eth) + " ether");

    //reply torpedo player1 [2]
    leaf = keccak256(M_p1[x+n*y])
    proof = tree_p1.getHexProof(leaf);
    positions = tree_p1.getProof(leaf).map(x => x.position === 'right' ? 1 : 0);
    gasEstimate = await instance.reply_torpedo.estimateGas(Number(id), "0", random_M1[x+n*y], Number(x), y, proof, positions, {from: player1});
    await instance.reply_torpedo(Number(id), "0", random_M1[x+n*y], Number(x), Number(y), proof, positions, {from: player1});
    console.log("<reply_torpedo> (player1) [2]");
    console.log("gas estimation = " + gasEstimate + " units");
    console.log("gas cost estimation = " + (gasEstimate * gasPrice) + " wei");
    console.log("gas cost estimation = " + ((gasEstimate * gasPrice)/eth) + " ether");

    //launch torpedo player1 [3]
    x=1; y=1;
    gasEstimate = await instance.launch_torpedo.estimateGas(id, x, y, {from: player1});
    await instance.launch_torpedo(id ,x ,y , {from: player1});
    console.log("<launch_torpedo> (player1) [3]");
    console.log("gas estimation = " + gasEstimate + " units");
    console.log("gas cost estimation = " + (gasEstimate * gasPrice) + " wei");
    console.log("gas cost estimation = " + ((gasEstimate * gasPrice)/eth) + " ether");
    //reply torpedo player2 [3]
    leaf = keccak256(M_p2[x+n*y])
    proof = tree_p2.getHexProof(leaf);
    positions = tree_p2.getProof(leaf).map(x => x.position === 'right' ? 1 : 0);
    gasEstimate = await instance.reply_torpedo.estimateGas(id, "1", random_M2[x+n*y], x, y, proof, positions,{from: player2});
    await instance.reply_torpedo(id, "1", random_M2[x+n*y], x, y, proof, positions,{from: player2});
    console.log("<reply_torpedo> (player2) [3]");
    console.log("gas estimation = " + gasEstimate + " units");
    console.log("gas cost estimation = " + (gasEstimate * gasPrice) + " wei");
    console.log("gas cost estimation = " + ((gasEstimate * gasPrice)/eth) + " ether");

    //launch torpedo player2 [4]
    x = 0; y=1;
    gasEstimate = await instance.launch_torpedo.estimateGas(id, x, y, {from: player2});
    await instance.launch_torpedo(id, x, y, {from: player2});
    console.log("<launch_torpedo> (player2) [4]");
    console.log("gas estimation = " + gasEstimate + " units");
    console.log("gas cost estimation = " + (gasEstimate * gasPrice) + " wei");
    console.log("gas cost estimation = " + ((gasEstimate * gasPrice)/eth) + " ether");

    //reply torpedo player1 [4]
    leaf = keccak256(M_p1[x+n*y])
    proof = tree_p1.getHexProof(leaf);
    positions = tree_p1.getProof(leaf).map(x => x.position === 'right' ? 1 : 0);
    gasEstimate = await instance.reply_torpedo.estimateGas(id, "0", random_M1[x+n*y], x, y, proof, positions, {from: player1});
    await instance.reply_torpedo(id, "0", random_M1[x+n*y], x, y, proof, positions,{from: player1});
    console.log("<reply_torpedo> (player1) [4]");
    console.log("gas estimation = " + gasEstimate + " units");
    console.log("gas cost estimation = " + (gasEstimate * gasPrice) + " wei");
    console.log("gas cost estimation = " + ((gasEstimate * gasPrice)/eth) + " ether");

    //launch torpedo player1 [5]
    x=2; y=3;
    gasEstimate = await instance.launch_torpedo.estimateGas(id, x, y, {from: player1});
    await instance.launch_torpedo(id ,x ,y , {from: player1});
    console.log("<launch_torpedo> (player1) [5]");
    console.log("gas estimation = " + gasEstimate + " units");
    console.log("gas cost estimation = " + (gasEstimate * gasPrice) + " wei");
    console.log("gas cost estimation = " + ((gasEstimate * gasPrice)/eth) + " ether");
    //reply torpedo player2 [5]
    leaf = keccak256(M_p2[x+n*y])
    proof = tree_p2.getHexProof(leaf);
    positions = tree_p2.getProof(leaf).map(x => x.position === 'right' ? 1 : 0);
    gasEstimate = await instance.reply_torpedo.estimateGas(id, "1", random_M2[x+n*y], x, y, proof, positions,{from: player2});
    await instance.reply_torpedo(id, "1", random_M2[x+n*y], x, y, proof, positions,{from: player2});
    console.log("<reply_torpedo> (player2) [5]");
    console.log("gas estimation = " + gasEstimate + " units");
    console.log("gas cost estimation = " + (gasEstimate * gasPrice) + " wei");
    console.log("gas cost estimation = " + ((gasEstimate * gasPrice)/eth) + " ether");

    //launch torpedo player2 [6]
    x=0; y=3;
    gasEstimate = await instance.launch_torpedo.estimateGas(id, x, y, {from: player2});
    await instance.launch_torpedo(id, x, y, {from: player2});
    console.log("<launch_torpedo> (player2) [6]");
    console.log("gas estimation = " + gasEstimate + " units");
    console.log("gas cost estimation = " + (gasEstimate * gasPrice) + " wei");
    console.log("gas cost estimation = " + ((gasEstimate * gasPrice)/eth) + " ether");

    //reply torpedo player1 [6]
    leaf = keccak256(M_p1[x+n*y])
    proof = tree_p1.getHexProof(leaf);
    positions = tree_p1.getProof(leaf).map(x => x.position === 'right' ? 1 : 0);
    gasEstimate = await instance.reply_torpedo.estimateGas(id, "0", random_M1[x+n*y], x, y, proof, positions,{from: player1});
    await instance.reply_torpedo(id, "0", random_M1[x+n*y], x, y, proof, positions,{from: player1});
    console.log("<reply_torpedo> (player1) [6]");
    console.log("gas estimation = " + gasEstimate + " units");
    console.log("gas cost estimation = " + (gasEstimate * gasPrice) + " wei");
    console.log("gas cost estimation = " + ((gasEstimate * gasPrice)/eth) + " ether");

    //launch torpedo player1 [7]
    x=3; y=3;
    gasEstimate = await instance.launch_torpedo.estimateGas(id, x, y, {from: player1});
    await instance.launch_torpedo(id ,x ,y , {from: player1});
    console.log("<launch_torpedo> (player1) [7]");
    console.log("gas estimation = " + gasEstimate + " units");
    console.log("gas cost estimation = " + (gasEstimate * gasPrice) + " wei");
    console.log("gas cost estimation = " + ((gasEstimate * gasPrice)/eth) + " ether");
    //reply torpedo player2 [7]
    leaf = keccak256(M_p2[x+n*y])
    proof = tree_p2.getHexProof(leaf);
    positions = tree_p2.getProof(leaf).map(x => x.position === 'right' ? 1 : 0);
    gasEstimate = await instance.reply_torpedo.estimateGas(id, "1", random_M2[x+n*y], x, y, proof, positions,{from: player2});
    await instance.reply_torpedo(id, "1", random_M2[x+n*y], x, y, proof, positions,{from: player2});
    console.log("<reply_torpedo> (player2) [7]");
    console.log("gas estimation = " + gasEstimate + " units");
    console.log("gas cost estimation = " + (gasEstimate * gasPrice) + " wei");
    console.log("gas cost estimation = " + ((gasEstimate * gasPrice)/eth) + " ether");

    //estimate verify_winner
    gasEstimate = await instance.verify_winner.estimateGas(id, M_p1.map(v => parseInt(v)), {from: player1});
    await instance.verify_winner(id, M_p1.map(v => parseInt(v)), {from: player1});
    console.log("<verify_winner> (player1)");
    console.log("gas estimation = " + gasEstimate + " units");
    console.log("gas cost estimation = " + (gasEstimate * gasPrice) + " wei");
    console.log("gas cost estimation = " + ((gasEstimate * gasPrice)/eth) + " ether");

    //check if the balance of the smart contract equal to 0
    ris = await instance.getBalance.call();
    assert.equal(ris, 0, "The result should be "+0);
  })

  it ("Gas Estimate other functions", async function(){
    var player1 = accounts[2];
    var player2 = accounts[3];

    var n = 4;
    //getGasPrice returns the gas price on the current network
    var eth = 1000000000000000000; //1eth is 1000000000000000000 wei
    var gasPrice = await web3.eth.getGasPrice()
    console.log("Gas Price is " + gasPrice + " wei"); // "10000000000000"

    //create contract
    const instance = await BattleShips.new();
    
    //new_game
    await instance.new_game(n, {from: player1});
    var id = await instance.get_id_player.call({from: player1});

    //estimate join_game
    gasEstimate = await instance.join_game.estimateGas(Number(id), {from: player2});
    await instance.join_casual_game({from: player2});
    console.log("<join_game>");
    console.log("gas estimation = " + gasEstimate + " units");
    console.log("gas cost estimation = " + (gasEstimate * gasPrice) + " wei");
    console.log("gas cost estimation = " + ((gasEstimate * gasPrice)/eth) + " ether");

    //propose stake of player1
    await instance.propose_stake(Number(id), BigInt(eth), {from: player1});

    //propose stake player2
    await instance.propose_stake(Number(id), BigInt(eth), {from: player2});

    //PLAYER1
    const M_p1_ships = [ '0', '-1', '-1', '-1',
                         '-1', '1', '-1', '-1',
                         '-1', '-1', '-1', '-1',
                         '-1', '-1', '2', '2'];
    const M_p1 = ['1', '0', '0', '0',
                  '0', '1', '0', '0',
                  '0', '0', '0', '0',
                  '0', '0', '1', '1'];

    const { MerkleTree } = require('merkletreejs')
    const keccak256 = require('keccak256');

    var random_M1 = mylib.setRandomMatrix(M_p1, n);

    const leaves_p1 = M_p1.map(v => keccak256(v));
    const tree_p1 = new MerkleTree(leaves_p1, keccak256)
    const root_p1 = tree_p1.getHexRoot() //verify root
    console.log("root:"+root_p1);
    //set root p1
    var M_p1_ships_int = M_p1_ships.map(v => parseInt(v));
    const random_M1_int = random_M1.map(v => parseInt(v));
    await instance.set_root(Number(id), M_p1_ships_int, random_M1_int, {from: player1});
    //get root p1
    ris = await instance.get_root_player.call(Number(id),{from: player1});
    assert.equal(ris, root_p1, "The result should be "+root_p1);

    //PLAYER2
    const M_p2_ships = [ '0', '-1', '-1', '-1',
                         '-1', '1', '-1', '-1',
                         '-1', '-1', '-1', '-1',
                         '-1', '-1', '2', '2' ];
    const M_p2 = ['1', '0', '0', '0',
                  '0', '1', '0', '0',
                  '0', '0', '0', '0',
                  '0', '0', '1', '1'];

    var random_M2 = mylib.setRandomMatrix(M_p2, n);

    const leaves_p2 = M_p2.map(v => keccak256(v));
    const tree_p2 = new MerkleTree(leaves_p2, keccak256)
    const root_p2 = tree_p2.getHexRoot()
    //set root p2
    const M_p2_ships_int = M_p2_ships.map(v => parseInt(v));
    const random_M2_int = random_M2.map(v => parseInt(v));
    await instance.set_root(Number(id), M_p2_ships_int, random_M2_int, {from: player2});
    //get root p2
    ris = await instance.get_root_player.call(Number(id),{from: player2});
    assert.equal(ris, root_p2, "The result should be "+root_p2);

    //transfer wei player1
    await instance.transfer_wei(Number(id), {from: player1, value: eth });

    //transfer wei player2
    await instance.transfer_wei(Number(id), {from: player2, value: eth });
    //check if the balance of the smart contract equal to 2eth
    ris = await instance.getBalance.call();
    assert.equal(Number(ris), 2*eth, "The result should be "+2*eth)

    //launch torpedo player1 [1]
    var x = 0;
    var y = 0;
    ris = await instance.get_state_battleship.call(Number(id));
    assert.equal(ris, 4, "The result should be "+4);
    await instance.launch_torpedo(Number(id), x, y, {from: player1});
    ris = await instance.get_state_battleship.call(Number(id));
    assert.equal(ris, 4, "The result should be "+4);

    //reply torpedo player2 [1]
    leaf = keccak256(M_p2[x+n*y])
    proof = tree_p2.getHexProof(leaf);
    positions = tree_p2.getProof(leaf).map(x => x.position === 'right' ? 1 : 0);
    ris = await instance.get_state_battleship.call(Number(id));
    assert.equal(ris, 4, "The result should be "+4);
    await instance.reply_torpedo(Number(id), "1", random_M2[x+n*y], Number(x), Number(y), proof, positions,{from: player2});

    //accuse adversary (player1 accuse player2)
    gasEstimate = await instance.accuse_adversary.estimateGas(Number(id), {from: player1});
    await instance.accuse_adversary(Number(id), {from: player1});
    console.log("<accuse_adversary>");
    console.log("gas estimation = " + gasEstimate + " units");
    console.log("gas cost estimation = " + (gasEstimate * gasPrice) + " wei");
    console.log("gas cost estimation = " + ((gasEstimate * gasPrice)/eth) + " ether");

    //reward_accuser player1
    gasEstimate = await instance.reward_accuser.estimateGas(Number(id), {from: player1});
    await instance.reward_accuser(Number(id), {from: player1});
    console.log("<reward_accuser> (by player1)");
    console.log("gas estimation = " + gasEstimate + " units");
    console.log("gas cost estimation = " + (gasEstimate * gasPrice) + " wei");
    console.log("gas cost estimation = " + ((gasEstimate * gasPrice)/eth) + " ether");
  })

  
});