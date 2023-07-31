App = {
  web3Provider: null,
  contracts: {},
  account: {},
  board_1: [], //board matrix 1
  ships: {}, //id -> number of cells of the boat (I need it to understand the dimensions of my boats)
  board_ship: [], //matrix of the board where on the cells there are the ids of the positions of the boats
  n: 0, //height and length of the board, initially set to 0
  angle: 0,
  gameid: -1, //match id
  M_random: [], //contains only the random values
  M_final: [], //contains the results of the cells of the board concatenated with the random values
  game: false, //if it's not the first game I set it to true
  reward: 0,

  init: async function() {
      await App.initWeb3();
  },

  initWeb3: async function() {
    //codice necessario metamask
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      try {
        await window.ethereum.enable();	// Request account access
      } catch(error) {
        console.error(error);	// User was denied account access
        }
          }
          else if (window.web3) {
            App.web3Provider = window.web3.currentProvider;
          }
        else {
        App.web3Provider = new Web3.provider.HttpProvider("http://localhost:7545");
          
      } web3 = new Web3(App.web3Provider);
        return App.initContract()
  },

  initContract: async function() {
    $.getJSON("BattleShips.json").done(function(data) {
      var BattleArtifact = data;
      App.contracts.Battle = TruffleContract(BattleArtifact);
      App.contracts.Battle.setProvider(App.web3Provider);
      App.listenForEvents();
      App.render();
      });
  },

  flip: async function() {
    const optionContainer = document.querySelector('.option-container');
    const optionShips = Array.from(optionContainer.children);
    App.angle = App.angle === 0 ? 90 : 0;
    optionShips.forEach(optionShip => {
      var height = optionShip.style.height;
      var width = optionShip.style.width;
      optionShip.style.width = height;
      optionShip.style.height = width;
    })
  },


  newgame: async function() {
    var addr = web3.eth.accounts[0];
    App.contracts.Battle.deployed().then(async(instance) => {
      //check if I have already started a game
      var gameid=await instance.get_id_player.call({from: addr});
      App.gameid = Number(gameid);
      if (Number(App.gameid)==-1) { /* create new game */
        //reset html
        $("#game-winner").html("winner:");
        $("#game-turn").html("game-turn:");
        $("#reward-winner").html("reward-winner:");
        $("#board-dim").html("board-dim:");
        $("#game-state").html("game-state:");

        console.log("App.game:"+App.game)
        var game = JSON.parse(localStorage.getItem('gameJSON'));
        if (game) { //this is not my first game, i must reset boards
          document.getElementById('board1').style.visibility = 'hidden';
          document.getElementById('board2').style.visibility = 'hidden';
          document.getElementById('my-board').style.visibility = 'hidden';
          document.getElementById('opponent-board').style.visibility = 'hidden';
          document.getElementById("list-reply").innerHTML = ''
          document.getElementById("list-stake").innerHTML = ''
          document.getElementById("list-torpedo").innerHTML = ''
        }

        alert("Create new game");
        //get "Board Dimension" for the new game
        var intField = document.getElementById("dimen");
        if (intField.value == '' || intField.value%2!=0 || intField.value>10) {
            return;
        }
        App.n=intField.value;
        try {
          await instance.new_game(intField.value, {from: addr});
          App.game = true;
          var gameJSON = JSON.stringify(App.game); //save board_1
          localStorage.setItem('gameJSON', gameJSON);
          alert("Game created successfully! Wait for the second player.");
        } catch(err) {
          alert("Game not created!");
        }
      }
      else { /*stai già facendo parte di una partita*/
        alert("You already play a game");
      }
    });

    App.render();
  },

  joinGame: async function() {
    var addr = web3.eth.accounts[0];
    App.contracts.Battle.deployed().then(async(instance) =>{
      //check if the player is in a game
      var gameid = await instance.get_id_player.call({from: addr});
      App.gameid = Number(gameid);
      if (gameid!=-1) { //il giocatore partecipa in una partita
        alert("You already participate in a game!");
        return;
      }
      //get ID for join a game
      var intField = document.getElementById("insert-id");
      if (intField.value<0) { //value not valid
        alert("The entered ID is not valid!");
        return;
      }
      //call method
      try {
        //reset html
        $("#game-winner").html("winner:");
        $("#game-turn").html("game-turn:");
        $("#reward-winner").html("reward-winner:");
        $("#board-dim").html("board-dim:");
        $("#game-state").html("game-state:");
        App.game = true;
        var gameJSON = JSON.stringify(App.game); //save board_1
        localStorage.setItem('gameJSON', gameJSON);
        var game = JSON.parse(localStorage.getItem('gameJSON'));
        if (game) { //this is not my first game, i must reset boards
          document.getElementById('board1').style.visibility = 'hidden';
          document.getElementById('board2').style.visibility = 'hidden';
          document.getElementById('my-board').style.visibility = 'hidden';
          document.getElementById('opponent-board').style.visibility = 'hidden';
          document.getElementById("list-reply").replaceChildren();
          document.getElementById("list-stake").replaceChildren();
          document.getElementById("list-torpedo").replaceChildren();
        }

        await instance.join_game(Number(intField.value), {from: addr});
        App.game = true;
        gameJSON = JSON.stringify(App.game); //save board_1
        localStorage.setItem('gameJSON', gameJSON);
        var dim = await instance.get_n_battleship.call(Number(intField.value), {from: addr});
        App.n = Number(dim);
        alert("You are in the match!");
        alert("Please, propose a stake value after player1!");
      }
      catch(err) {
        alert(err);
        alert("You canceled the operation or you cannot partecipate!");
      }
    });
  },

  joincasualGame: async function() {
    var addr = web3.eth.accounts[0];
    App.contracts.Battle.deployed().then(async(instance) =>{
    //check if the player is in a game
    var ris = await instance.get_id_player.call({from: addr});
    App.gameid = Number(ris);
    if (Number(App.gameid)!=-1) { //il giocatore partecipa in una partita
      alert("You already participate in a game!");
      return;
    }
    //call method
    try {
      //reset html
      $("#game-winner").html("winner:");
      $("#game-turn").html("game-turn:");
      $("#reward-winner").html("reward-winner:");
      $("#board-dim").html("board-dim:");
      $("#game-state").html("game-state:");
      var game = JSON.parse(localStorage.getItem('gameJSON'));
      if (game) { //this is not my first game, i must reset boards
        document.getElementById('board1').style.visibility = 'hidden';
        document.getElementById('board2').style.visibility = 'hidden';
        document.getElementById('my-board').style.visibility = 'hidden';
        document.getElementById('opponent-board').style.visibility = 'hidden';
        document.getElementById("list-reply").replaceChildren();
        document.getElementById("list-stake").replaceChildren();
        document.getElementById("list-torpedo").replaceChildren();
      }

      await instance.join_casual_game({from: addr});
      App.game = true;
      var gameJSON = JSON.stringify(App.game); //save board_1
      localStorage.setItem('gameJSON', gameJSON);
      ris = await instance.get_n_battleship.call(Number(App.gameid), {from: addr});
      App.n = Number(ris);
      alert("You are in the match!");
      alert("Please, propose a stake value after player1!");
    }
    catch(err) {
      alert("You canceled the operation or you cannot partecipate!");
    }
    });
  },

  proposestake: async function() {
    var addr = web3.eth.accounts[0];
    App.contracts.Battle.deployed().then(async(instance) =>{
      //check if the player is currently playing in a match
      //return id of the match or 0
      App.gameid = await instance.get_id_player.call({from: addr});
      if (Number(App.gameid)==-1) {
        alert("you are not playing any games");
        return;
      }
      //check if i'm in the state 1
      var state = await instance.get_state_battleship.call(Number(App.gameid), {from: addr});
      if (state != 1) {
        alert("Wait for player two.");
        return;
      }
      //read value from field
      var intField = document.getElementById("stake-set");
      if (intField.value<=0) {
        alert("you must enter a value greater than 0");
        return;
      }
      await instance.propose_stake(Number(App.gameid), Number(intField.value), {from: addr});
    });
  },

  transferwei: async function() {
    var addr = web3.eth.accounts[0];
    App.contracts.Battle.deployed().then(async(instance) =>{
      var ris = await instance.get_id_player.call({from: addr});
      App.gameid = Number(ris);
      if (App.gameid==-1) {
        alert("you are not playing any games");
        return;
      }

      //check state
      var state = await instance.get_state_battleship.call(Number(ris), {from: addr});
      if (Number(state) != 3) {
        alert("You cannot send ether to the smart contract!");
        return;
      }
      //get stake value
      var val = await instance.get_stake_player.call(App.gameid, {from: addr});
      try {
        await instance.transfer_wei(App.gameid, {from: addr, value: Number(val)});
        alert("Operation done correctly!");
      } 
      catch (error) {
        console.log(error);
      }
    });
  },

  recoverwei: async function() {
    var addr = web3.eth.accounts[0];
    App.contracts.Battle.deployed().then(async(instance) =>{
      var ris = await instance.get_id_player.call({from: addr});
      App.gameid = Number(ris);
      if (App.gameid==-1) {
        alert("You are not playing any games!");
        return;
      }
      //check state
      var state = await instance.get_state_battleship.call(App.gameid, {from: addr});
      if (Number(state) != 3) {
        alert("You cannot send ether to the smart contract!");
        return;
      }
      //check stake_lock
      ris = await instance.get_stake_lock.call(App.gameid);
      if (Number(ris) != 2)
        return;

      try {
        await instance.recover_wei(App.gameid, {from: addr});
        alert("You have recovered the wei deposited on the contract!");
      }
      catch(error) {
      }
    });
  },

  setroot: async function() {
    //Returns a random number between min (inclusive) and max (exclusive)
    function getRandomArbitrary(min, max, M) {
      var tmp = Math.random() * (max - min) + min;
      while (elemExist(M, tmp.toString())) {
        tmp = Math.random() * (max - min) + min;
      }
      return tmp;
    }
    function elemExist(M, elem) {
      for (var i=0;i<M.length;i++) {
        if (M[i]==elem)
          return true;
      }
      return false;
    }

    App.contracts.Battle.deployed().then(async(instance) =>{
      var addr = web3.eth.accounts[0];
      //get id
      var gameid = await instance.get_id_player.call({from: addr});
      App.gameid = gameid;
      //get n
      var n = await instance.get_n_battleship.call(Number(gameid), {from: addr});
      App.n = n;
      var ris = await instance.get_root_player.call(Number(App.gameid), {from: addr});
      if (ris != "0x0000000000000000000000000000000000000000000000000000000000000000") {
        alert("address already set");
        return;
      }

      //init board_1 with n elem
      for (var i=0;i<n*n;i++) {
        App.board_1[i] = 0;
      }

      //copy board_1 to M_final
      for (var i=0;i<n*n;i++) {
        if (App.board_ship[i] == -1)
          App.M_final[i] = "0";
        else App.M_final[i] = "1";
      }

      //copy random values
      for (var i=0;i<n*n; i++) {
        var random = (Math.floor(getRandomArbitrary(0, 20000, App.M_random)));
        App.M_random[i] = random.toString();
        App.M_final[i] = App.M_final[i].concat(random.toString());
      }

      //save to json
      const boardJSON = JSON.stringify(App.board_1); //save board_1
      const shipJSON = JSON.stringify(App.board_ship) //save board_ship
      const randomJSON = JSON.stringify(App.M_random); //save M_random
      const finalJSON = JSON.stringify(App.M_final); //save M_final (board_1+M_random)
      //save to matrix.json
      localStorage.setItem('boardJSON', boardJSON);
      localStorage.setItem('shipJSON', shipJSON);
      localStorage.setItem('randomJSON', randomJSON);
      localStorage.setItem('finalJSON', finalJSON);

      //convert string[] to int[]
      var intBoard = App.board_ship.map((integer) => parseInt(integer));
      var intRandomBoard = App.M_random.map((integer) => parseInt(integer));

      //set root
      await instance.set_root(Number(gameid), intBoard, intRandomBoard, {from: addr});
      var ris = await instance.get_root_player.call(Number(gameid), {from: addr});
      console.log("get_root:"+ris);
    });
  },

  launchtorpedo: async function() {
    var addr = web3.eth.accounts[0]; //save address account about user that logged in metamask
    App.contracts.Battle.deployed().then(async(instance) =>{
      var gameid = await instance.get_id_player.call({from: addr});
      if (gameid == -1) {
        alert("Do not participate in any game!");
        return;
      }
      gamestate = await instance.get_state_battleship.call(Number(gameid), {from: addr});
      if (gamestate != 4) {
        alert("You cannot launch torpedo!");
        return;
      }
      //coordinate x
      var xField = document.getElementById("x-launch");
      x = xField.value;
      if (xField<0 || xField>(App.n-1)) {
        alert("coordinate doesn't correct");
        return;
      }
      //coordinate y
      var yField = document.getElementById("y-launch");
      y = yField.value;
      if (yField<0 || yField>(App.n-1)) {
        alert("coordinate doesn't correct");
        return;
      }
      
      try {
        await instance.launch_torpedo(Number(gameid), Number(x), Number(y),{from: addr});
      } catch(err) {

      }
    });
  },

  replytorpedo: async function() {
    var addr = web3.eth.accounts[0]; //save address account about user that logged in metamask
    App.contracts.Battle.deployed().then(async(instance) =>{
      var gameid = await instance.get_id_player.call({from: addr});
      if (gameid == -1) {
        alert("Do not participate in any game");
        return;
      }
      var gamestate = await instance.get_state_battleship.call(Number(gameid), {from: addr});
      if (gamestate != 4) {
        alert("You cannot reply torpedo!");
        return;
      }

      var n = await instance.get_n_battleship.call(Number(gameid),{from: addr});
      //coordinate x
      var xField = document.getElementById("x-reply");
      x = xField.value;
      if (xField<0 || xField>(Number(n)-1)) {
        alert("coordinate doesn't correct");
        return;
      }
      //coordinate y
      var yField = document.getElementById("y-reply");
      y = yField.value;
      if (yField<0 || yField>(Number(n)-1)) {
        alert("coordinate doesn't correct");
        return;
      }
      //result: miss: 0, hit:1
      var resultField = document.getElementById("reply-result");
      var result = resultField.value.toString();
      if (result!= "0" && result != "1") {
        alert("value not valid");
        return; 
      }

      //retrieve matrix
      var M_random = JSON.parse(localStorage.getItem('randomJSON'));
      var M_final = JSON.parse(localStorage.getItem('finalJSON'));
      var leaves = M_final.map(v => keccak256(v));
      var tree = new MerkleTree(leaves, keccak256);
      var leaf = keccak256(M_final[Number(x)+Number(n)*Number(y)]);
      var proof = tree.getHexProof(leaf);
      var positions = tree.getProof(leaf).map(x => x.position === 'right' ? 1 : 0);

      try {
        await instance.reply_torpedo(Number(gameid), result, M_random[Number(x)+Number(n)*Number(y)].toString(), Number(x), Number(y), proof, positions, {from: addr});
      }
      catch (err) {
        console.log("exception: reply_torpedo");
      }
    });
  },

  createboards: async function(n) {
    var gameboard1 = document.querySelector('#board1');
    var gameboard2 = document.querySelector('#board2');
    $('#my-board').html("my board");
    $('#opponent-board').html("opponent's board");
    document.getElementById("flip-button").style.visibility = "visible";

    document.getElementById('board1').style.visibility = 'visible';
    document.getElementById('board2').style.visibility = 'visible';
    document.getElementById('my-board').style.visibility = 'visible';
    document.getElementById('opponent-board').style.visibility = 'visible';
    //show option-container
    const cont = document.querySelector('.option-container');
    //option-container
    cont.style.display = "flex";

    //SET BOARDS
    function createBoard(board,n, matrix, board_ship, M_random, M_final){
      for (let i=0;i<n*n;i++){
        matrix[i]=0; //init matrix
        M_random[i]=0; //init
        M_final[i]=0; //init
        board_ship[i] = -1; //init board_ship. -1: nessuna barca, altrimenti il valore rappresenta l'id della barca.
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.value = i;
        board.append(cell);
    }
      board.style.setProperty("grid-template-columns", 'repeat('+n+', auto)');
      return board;
    }

    //reset arrays
    App.board_1 = [];
    App.board_ship = [];
    App.M_final = [];
    App.M_random = [];

    //reset boards
    for (var i=0;i<n*n;i++)
      App.board_1[i]=0;
    
    gameboard1.replaceChildren();
    gameboard2.replaceChildren();

    App.angle = 0;
    //create two boards    
    createBoard(gameboard1, n, App.board_1, App.board_ship, App.M_random, App.M_final);
    createBoard(gameboard2, n, App.board_1, App.board_ship, App.M_random, App.M_final);

    //creo option-container: sto creando il rettangolo dove posizionare le barche da spostare con il drag and drop
    const container = document.querySelector('.option-container');
    //reset option-container
    if (container!=null)
      container.replaceChildren();

    container.style.backgroundColor = 'yellow';
    /* create ships */
    const color = ["red", "blue", "green", "violet", "BlueViolet", "CornflowerBlue", "IndianRed", "Chocolate", "DarkMagenta", "DarkGreen"];
    var nship1 = Math.trunc(n/2);
    var nship2 = n-nship1-1;
    var id = 0; //rappresenta anche il numero di barche

    function create_ships(nship, id, weight) {
      for (var j=0;j<nship;j++) {
        const ship = document.createElement('div');
        ship.classList.add('ship-preview');
        ship.style.backgroundColor = color[id];
        ship.style.opacity = "0.75";
        App.ships[id] = weight;
        ship.id = id;
        id++;
        ship.setAttribute("draggable","true");
        ship.style.width = 40*weight+'px';
        container.append(ship);
      }

      return id;
    }

    //create ships type1
    id = create_ships(nship1, id, 1);
    //create ships type2
    id = create_ships(nship2, id, 2);
    //create ships type3
    if (n>=6) 
      id = create_ships(1, id, 3);

    //DRAG
    var ship_id; //ultimo id della barca che ho provato a trascinare
    var move_ship = {}; //map: id_ship -> position

    const optionContainer = document.querySelector('.option-container');
    const optionShips = Array.from(optionContainer.children);
    const target = Array.from(gameboard1.children); //target è l'array di my board (la board di sinistra), ogni elemento dell'array corrisponde a una cella.

    for (var i=0;i<id;i++) {
      optionShips[i].addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', e.target.id);
        ship_id = e.target.id;
      })
    }

    for (var j=0;j<n*n;j++) {
      target[j].addEventListener('dragover', (e) => {
        e.preventDefault();
      })
    }

    for (var j=0;j<n*n;j++) {
      target[j].addEventListener('drop', (e) => {
        e.preventDefault();

        //CHECK IF quella ship può stare sulla board (evito che sbordi in fuori)
        var dim_ship = App.ships[ship_id];
        id_cell = e.target.value; //id cella target sopra  il quale ho messo la mia barca
        console.log("id_cell:"+id_cell)
        //creo array che contiene l'indice finale di ogni colonna della board
        // prendo l'ultimo indice di riga di dove ho piazzato la mia barca
        if (App.angle == 0) {
          var tmp = n-1;
          var last_columns = []; //array che contiene l'indice finale di ogni colonna della board
          var column;

          //costruisco l'array che contiene l'indice finale di ogni colonna della board
          for (var i=0;i<n;i++) {
            last_columns[i] = parseInt(tmp);
            tmp = parseInt(tmp) + parseInt(n);
          }
      
          //prende l'indice finale di riga dove si trova la mia barca e lo salva nella variabile column
          for (var i=0;i<n;i++){
            if (id_cell<=last_columns[i]) {
              column = last_columns[i];
              break;
            }
          }

          //adesso posso controllare se la barca sta nella riga
          if (id_cell+(dim_ship-1)>column) {
            console.log("Non sta nella riga");
            return;
          }
        } //close if (angle == 0)

        if (App.angle == 90) {
          tmp = n*n-n;
          last_columns = [];
          index_cell = parseInt(id_cell); 

          for (var i=0;i<n;i++) {
            last_columns[i] = parseInt(tmp);
            tmp++;
          }

          function search(array, value, dim) {
            for (var i=0;i<dim;i++) {
              if (array[i]==value)
                return array[i];
            }

            return -1;
          }

          //controllo che index_cell compaia in last_columns
          for (var j=0;j<n;j++) {
            if (search(last_columns, index_cell, n) != -1) {
              column = search(last_columns, index_cell, n);
            }
            index_cell = parseInt(index_cell) + parseInt(n);
          }

          //adesso posso controllare se la barca sta nella colonna
          if (id_cell+(dim_ship-1)*n>column) {
            console.log("la barca non sta nella colonna");
            return;
          }
        } //close if (angle == 90)

        // evito di andare sopra le celle già riempite
        if (e.target.value == undefined) {
          console.log(e.target.value)
          console.log("cella già riempita");
          return;
        }
        
        //se sposto una barca già spostata in precedenza la riazzero,
        //guardo le celle che aveva settato e le mette a 0
        for (var i=0;i<n*n;i++) {
          if (App.board_ship[i] == ship_id) {
            App.board_ship[i] = -1;
            App.board_1[i] = 0;
          }
        }

        //controllo se su quelle celle dove voglio mettere la barca non ce ne sia già un'altra
        if (App.angle == 0) {
          for (var i=0;i<App.ships[ship_id];i++) {
            if (App.board_1[id_cell+i]!=0) {
              console.log("ship already present!")
              return;
            }
          }
        }
        if (App.angle == 90) {
          for (var i=0;i<App.ships[ship_id];i=i+n) {
            if (App.board_1[id_cell+i]!=0) {
              console.log("ship already present!")
              return;
            }
          }
        }
        
        //aggiorno la matrice della board e di ships
        var index = e.target.value;

        for (var i=0; i<App.ships[ship_id];i++) {
          if (App.angle==0) {
            App.board_1[index] = 1;
            App.board_ship[index] = Number(ship_id);
            index++;
          }
          else {
            App.board_1[index] = 1;
            App.board_ship[index] = Number(ship_id);
            index = parseInt(index) + parseInt(n);
          }
        }

        //effettua spostamento
        var sourceID = e.dataTransfer.getData('text/plain');
        e.target.appendChild(document.getElementById(sourceID));
        document.getElementById(sourceID).style.margin = "0px";
        move_ship[ship_id] = e.target.value;

        //CONTROLLO DI AVER MESSO TUTTE LE BARCHE SULLA BOARD E ATTIVO IL TASTO START
        let nships=0;
        let cont=0;
        
        for (var i=0;i<id;i++) {
          nships = nships + App.ships[i];
        }
        for (var i=0;i<n*n;i++) {
          if (App.board_1[i] != 0) {
            cont++;
          }
        }          
        if (nships==cont) {
          document.getElementById("start-button").disabled = false;
        }
      })
    }
  },

  nextblock: function() {
    var addr = web3.eth.accounts[0];
    App.contracts.Battle.deployed().then(async(instance) => {
      await instance.next_block({from:addr});
      console.log("go to the next block");
    });
  },

  verifywinner: function() {
    var addr = web3.eth.accounts[0];
    App.contracts.Battle.deployed().then(async(instance) => {
      var gameid = await instance.get_id_player.call({from:addr});
      if (gameid == -1) {
        alert("You need to create a game first!");
        return;
      }
      var state = await instance.get_state_battleship.call(Number(gameid), {from: addr});
      if (state != 5) {
        alert("You cannot verify winner!");
        return;
      }
      //retrieve board_1
      var board_ship = JSON.parse(localStorage.getItem('shipJSON'));
      var board = new Array();

      //convert board_ship to board that contain 1 if the ship compare on this cell, 0 otherwise
      for (var i=0;i<board_ship.length;i++) {
        if (board_ship[i] == -1)
          board[i] = 0;
        else board[i] = 1;
      }

      /*
      //DEBUG comments
      console.log("gameid:"+Number(gameid));
      console.log("board_1:"+board.map(v => parseInt(v)));
      var tmp = board.map(v => parseInt(v));
      console.log(tmp);
      console.log("length:"+board.length);
      */
      await instance.verify_winner(Number(gameid), board.map(v => parseInt(v)), {from: addr});
    });
  },
  
  accuseadversary: function() {
    var addr = web3.eth.accounts[0];
    App.contracts.Battle.deployed().then(async(instance) => {
      var gameid = await instance.get_id_player.call({from:addr});
      if (gameid == -1) {
        alert("you need to create a game first");
        return;
      }
      var state = await instance.get_state_battleship.call(Number(gameid), {from: addr});
      if (Number(state) != 4) {
        alert("You cannot accuse adversary!");
        return;
      }
      var turn = await instance.get_turn.call(Number(gameid), {from: addr});
      var reply = await instance.get_reply.call(Number(gameid), {from: addr});
      var p1 = await instance.get_player1_battleship.call(Number(gameid), {from: addr});
      var p2 = await instance.get_player2_battleship.call(Number(gameid), {from: addr});

      if (p1 == addr && Number(turn) == 0 && reply==false) {
        alert("You cannot accuse adversary!");
        return;
      }
      if (p2 == addr && Number(turn) == 1 && reply==false) {
        alert("You cannot accuse adversary!");
        return;
      }
      if (p1 == addr && Number(turn) == 1 && reply==true) {
        alert("You cannot accuse adversary!");
        return;
      }
      if (p2 == addr && Number(turn) == 0 && reply==true) {
        alert("You cannot accuse adversary!");
        return;
      }
      await instance.accuse_adversary(Number(gameid), {from: addr});
    });
  },

  rewardaccuser: function() {
    var addr = web3.eth.accounts[0];
    App.contracts.Battle.deployed().then(async(instance) => {
      var gameid = await instance.get_id_player.call({from:addr});
      if (gameid == -1) {
        alert("you need to create a game first");
        return;
      }
      var state = await instance.get_state_battleship.call(Number(gameid), {from: addr});
      if (Number(state) != 4) {
        alert("You cannot accuse adversary!");
        return;
      }
      await instance.reward_accuser(Number(gameid), {from: addr});
    });
  },

  // Listen for events emitted from the contract
  listenForEvents: function() {
    var addr = web3.eth.accounts[0]; //save address account about user that logged in metamask
    $("#accountAddress").html("Your Account: " + addr);

    App.contracts.Battle.deployed().then(async(instance) =>{
      instance.NGame({}, { //event NGame (uint id, uint n, address game_creator);
        fromBlock: 0,
        toBlock: 'latest'
      }).watch(function(error, event) {
        if (event["args"].game_creator == addr) {
          //set html game-id
          gameid = event["args"].id.toNumber();
          App.gameid = Number(gameid);
          $("#game-id").html("game-id: "+gameid);
          //set n
          App.n = event["args"].n.toNumber();
          $("#board-dim").html("board-dim: " + event["args"].n);
          //set html game-state
          $("#game-state").html("game-state: "+0)
          console.log('[NewGame] gameid:'+ event["args"].id + ",addresscreator:"+event["args"].game_creator+",dim:"+event["args"].n);
        }
      });

      instance.StartGame({}, { //event StartGame(uint id, uint n, address p1, address p2, uint code); //code=0: can start game, code=1: can't start game  
        fromBlock: 0,
        toBlock: 'latest'
      }).watch(function(error, event) {
        var addr = web3.eth.accounts[0];
        if (addr == event["args"].p1 || addr == event["args"].p2) { //event of my match
          if (event["args"].code == 0) { //can start game
            //set html game-id
            App.gameid = Number(event["args"].id);
            $("#game-id").html("game-id: "+event["args"].id);
            //set html game-state
            $("#game-state").html("game-state: "+1);
            //set n
            App.n = event["args"].n;
            $("#board-dim").html("board-dim: " + event["args"].n);
            
            if (addr == event["args"].p1) { //i'm player1
              alert("The second player joined the game, you can start the match.");
              alert("Please, propose a stake value!");
            }

            console.log("[StartGame] gameid:"+event["args"].id+", n:"+event["args"].n+", p1:"+event["args"].p1+", p2:"+event["args"].p2);
          }
          if (event["args"].code == 1) { //can't start game
            console.log("[StartGame] gameid: "+event["args"].id+", player: "+event["args"].p1);
          }
        }
      });

      instance.ProposeStake({}, { //event ProposeStake(uint stake, uint id, address p, address r); //p: player that had proposed stake, r: player that had receive proposed
        fromBlock: 0,
        toBlock: 'latest'
      }).watch(function(error, event) {
        if (event["args"].player != "0x") {
          if (addr == event["args"].p) { //player that had proposed stake
            var elem = "[my proposal] "+"stake:"+event["args"].stake+"";
            //add to html
            const node = document.createElement("li");
            const textnode = document.createTextNode(elem);
            node.appendChild(textnode);
            document.getElementById("list-stake").appendChild(node);
            console.log("[ProposeStake] stake:"+event["args"].stake+", id:"+event["args"].id+", proposed:"+event["args"].p+", received:"+event["args"].r);
          }
          if (addr == event["args"].r) { //r: player that had receive proposed
            var elem = "[opposite] "+"stake:"+event["args"].stake+"";
            //add to html
            const node = document.createElement("li");
            const textnode = document.createTextNode(elem);
            node.appendChild(textnode);
            document.getElementById("list-stake").appendChild(node);
            alert("You have received a stake offer!");
            console.log("[ProposeStake] stake:"+event["args"].stake+", id:"+event["args"].id+", proposed:"+event["args"].p+", received:"+event["args"].r);
          }
        }
      });

      instance.StakeDecided({}, { //event StakeDecided(uint id, uint stake_value, address player1, address player2, uint n); //player1: player that had decided the stake, player2: other player in the games
        fromBlock: 0,
        toBlock: 'latest'
      }).watch(function(error, event) {
        if (event["args"].stake_value > 0) {
          if (addr == event["args"].p1 || addr == event["args"].p2) { //i'm a player in the match
            //add to html
            var elem = "agreed: "+event["args"].stake_value;
            const node = document.createElement("li");
            const textnode = document.createTextNode(elem);
            node.appendChild(textnode);
            document.getElementById("list-stake").appendChild(node);
            //set html game-state
            $("#game-state").html("game-state: "+2);
            alert("You have found a stake agreement! Please place the ships and then set the root");
            console.log("[StakeDecided] id:"+event["args"].id+", stake_value:"+event["args"].stake_value);
            App.reward = Number(event["args"].stake_value)*2;
            //set boards
            App.createboards(event["args"].n);
          }
          }
      });

    instance.TransferWei({}, { //event TransferWei(uint id, address p1, address p2, uint n); //both players have deposited ether on the blockchain
      fromBlock: 0,
      toBlock: 'latest'
    }).watch(function(error, event) {
      if (event["args"].p1 == addr || event["args"].p2 == addr) {
          //set html game-turn
          if (addr == event["args"].p1)
            $("#game-turn").html("game-turn: my turn");
          else 
            $("#game-turn").html("game-turn: opposite turn");
          //set html game-state
          $("#game-state").html("game-state: "+3);
          console.log("[TransferWei] id:"+event["args"].id+", n:"+event["args"].n);
          alert("Both players have deposited Wei on the blockchain!");
          alert("Now you can start the game!");
        }
    });

    instance.PlayerSetRoot({}, {
      fromBlock: 0,
      toBlock: 'latest'
    }).watch(function(error, event) {
      if (event["args"].p == addr) {
        //retrieve board_ship
        var board_ship = JSON.parse(localStorage.getItem('shipJSON'));
        //reset gameboard
        var gameboard1 = document.querySelector('#board1');
        gameboard1.replaceChildren();
        //create cells
        for (let i=0;i<board_ship.length;i++){
          const cell = document.createElement('div');
          cell.classList.add('cell');
          cell.value = i;
          gameboard1.append(cell);
        }
        //set board_1 with the ships
        const color = ["red", "blue", "green", "violet", "BlueViolet", "CornflowerBlue", "IndianRed", "Chocolate", "DarkMagenta", "DarkGreen"];
        gameboard1 = document.querySelector('#board1');
        const target1 = Array.from(gameboard1.children); //target è l'array di my board (la board di sinistra), ogni elemento dell'array corrisponde a una cella.
        for (var i=0;i<board_ship.length;i++) {
          if (board_ship[i] != -1) {
            target1[i].style.backgroundColor = color[board_ship[i]]
            target1[i].style.opacity ="0.75";
          }
        }
        console.log("[PlayerSetRoot]")
        //hide flip button
        document.getElementById("flip-button").style.visibility = "hidden";
        //hide option-container
        const container = document.querySelector('.option-container');
        //reset option-container
        container.style.display = "none";
      }
    });
 
    instance.RootSet({}, { //event RootSet(uint id, address p1, address p2); //both roots have been set, p1: player1 of the game, p2: player2 of the game
      fromBlock: 0,
      toBlock: 'latest'
    }).watch(function(error, event) {
        if (event["args"].p1 == addr || event["args"].p2 == addr) { //i'm player1 or player2
          //set html game-state
          $("#game-state").html("game-state: "+3)
        }
    });

    instance.LaunchTorpedo({}, { //event LaunchTorpedo(uint id, uint x, uint y, address p1, address p2, int turn); //p1: player that had launch a torpedo, p2: player that had receive a torpedo
          fromBlock: 0,
          toBlock: 'latest'
        }).watch(function(error, event) {
            if (event["args"].player != '0x') {
              console.log("[LaunchTorpedo] id:"+event["args"].id);
              if (event["args"].p1 == addr) { //I launched a torpedo
                //set html list-torpedo
                var elem = "[launched torpedo] x:"+event["args"].x+", y:"+event["args"].y;
                //add to html
                const node = document.createElement("li");
                const textnode = document.createTextNode(elem);
                node.appendChild(textnode);
                document.getElementById("list-torpedo").appendChild(node);
                $("#game-turn").html("game-turn: wait reply");
              }
              if (event["args"].p2 == addr) { //I received a torpedo
                //set html game-turn
                $("#game-turn").html("game-turn: send reply");
                //set html list-torpedo
                var elem = "[received torpedo] x:"+event["args"].x+", y:"+event["args"].y;
                alert("Received Torpedo on ("+event["args"].x+","+event["args"].y+"). Please, send a Reply.");
                //add to html
                const node = document.createElement("li");
                const textnode = document.createTextNode(elem);
                node.appendChild(textnode);
                document.getElementById("list-torpedo").appendChild(node);
              }
            }
        });

        instance.VerifyWin({}, {
          fromBlock: 0,
          toBlock: 'latest'
        }).watch(function(error, event) {
          if (event["args"].winner == addr) {
            console.log("[VerifyWinner] id:"+event["args"].id+",winner:"+event["args"].winner);
            //set html game-state
            App.gamestate = 5;
            $("#game-state").html("game-state: "+5);
            $("#game-turn").html("game-turn: verify win");
            //set html verify-winner
            $("#verify-winner").html("get the win!");
            alert("check if you won!");
          }
          if (event["args"].loser == addr) {
            $("#game-turn").html("game-turn: wait");
            App.gamestate = 5;
            $("#game-state").html("game-state: "+5);
          }
        });

        instance.ReplyTorpedo({}, { //event ReplyTorpedo(uint id, uint x, uint y, address p, string result); //result is miss:0, hit:1
          fromBlock: 0,
          toBlock: 'latest'
        }).watch(function(error, event) {
          var id = event["args"].id;
          var x = event["args"].x;
          var y = event["args"].y;
          var player = event["args"].p;
          var result = event["args"].result;
          var tmp = (result == "0" ? "miss" : "hit");

          if (player != '0x' && Number(App.gameid) == Number(id)) {
            if (player == addr) { //i launch reply_torpedo
              console.log("[ReplyTorpedo] id:"+id+", x:"+x+", y:"+y+", player:"+player+", result:"+result);
              $("#game-turn").html("game-turn: my turn");
              var elem = "[send reply] x:"+x+", y:"+y+", result:"+tmp;
              var gameboard1 = document.querySelector('#board1');
              var gameboard2 = document.querySelector('#board1');
              const target1 = Array.from(gameboard1.children); //target is the array of my board (the left board), each element of the array corresponds to a cell.
              const target2 = Array.from(gameboard2.children); //target is the array of my board (the left board), each element of the array corresponds to a cell.
              if (tmp == "hit") {
                //set the board_1
                var image = document.createElement("img");
                image.src = "images/flame.png";
                image.style.position = "absolute";
                image.style.height = "35px";
                image.style.width = "35px";
                target1[Number(x)+Number(App.n)*Number(y)].appendChild(image);
              }
              if (tmp == "miss") {
                var image = document.createElement("img");
                image.src = "images/drop.png";
                image.style.position = "absolute";
                image.style.height = "35px";
                image.style.width = "35px";
                target2[Number(x)+Number(App.n)*Number(y)].appendChild(image);
              }
            } //close if
            else { //i receive a reply-torpedo
              console.log("[ReplyTorpedo] id:"+id+", x:"+x+", y:"+y+", player:"+player+", result:"+result);

              $("#game-turn").html("game-turn: opposite turn");
              var elem = "[receive reply] x:"+x+", y:"+y+", result:"+tmp;
              var gameboard2 = document.querySelector('#board2');
              const target2 = Array.from(gameboard2.children); //target è l'array di my board (la board di sinistra), ogni elemento dell'array corrisponde a una cella.
              if (tmp == "hit") {
                //set the board_2
                var image = document.createElement("img");
                image.src = "images/flame.png";
                image.style.position = "absolute";
                image.style.height = "35px";
                image.style.width = "35px";
                target2[Number(x)+Number(App.n)*Number(y)].appendChild(image);
              }
              if (tmp == "miss") {
                var image = document.createElement("img");
                image.src = "images/drop.png";
                image.style.position = "absolute";
                image.style.height = "35px";
                image.style.width = "35px";
                target2[Number(x)+Number(App.n)*Number(y)].appendChild(image);
              }
            }//close else
            //add to html
            const node = document.createElement("li");
            const textnode = document.createTextNode(elem);
            node.appendChild(textnode);
            document.getElementById("list-reply").appendChild(node);
          }
        });

        instance.Cheat({}, { //event Cheat(uint id, address p, uint code); //code=0: cheat attempt(id, cheater, 0), code=1: accuse player(id, accused, 1), code=2: lostforfeit (id, winner, 2)
          fromBlock: 0,
          toBlock: 'latest'
        }).watch(function(error, event) {
          if (event["args"].code == 0 && event["args"].p != '0x') { //cheat attempt
            if (event["args"].p == addr) {
            console.log("[CheatAttempt] id:"+event["args"].id+", cheater:"+event["args"].p);
            //add to html
            alert("You tried to cheat!");
            var elem = "you tried to cheat!";
            const node = document.createElement("li");
            const textnode = document.createTextNode(elem);
            node.appendChild(textnode);
            document.getElementById("list-reply").appendChild(node);
            }
          }
          if (event["args"].code == 1) { //accuse player
            if(Number(App.id) == event["args"].id) {
              if (addr == event["args"].p){  //i'm player accused
                $("#id-accuse").html("I've been accused of not playing for a while");
              }
              else { //i'm other player
                $("#id-accuse").html("I accused the other player of not playing");
              }
            }
            console.log("[AccusePlayer] id:"+event["args"].id+", accused:"+event["args"].p);
          }
        });

    instance.WinForCheat({}, { //event WinForCheat(uint id, address winner, address loser); //event in case i lost forfeit (nel caso abbia perso a tavolino);
          fromBlock: 0,
          toBlock: 'latest'
        }).watch(function(error, event) {
          if (event["args"].winner == addr) { //i'm the winner
            console.log("[WinForCheat] gameid:"+event["args"].id+", winner:"+event["args"].winner+", loser:"+event["args"].loser);
            $("#game-winner").html("winner: I am the winner!");
            $("#reward-winner").html("reward-winner:"+App.reward);
            $("#game-state").html("game-state: "+6);
          }
          if (event["args"].loser == addr) { //i'm the loser
            console.log("[WinForCheat] gameid:"+event["args"].id+", winner:"+event["args"].winner+", loser:"+event["args"].loser);
            $("#game-winner").html("winner: opposite player");
            $("#reward-winner").html("reward-winner:"+App.reward);
            $("#game-state").html("game-state: "+6);
          }
        });        

        //the player won after accusing the other player of quitting the game
        instance.WinforLeaving({}, { //WinforLeaving(uint id, address winner, address loser, uint reward);
          fromBlock: 0,
          toBlock: 'latest'
        }).watch(function(error, event) {
          if (event["args"].winner == addr) { //i'm the winner
            console.log("[WinforLeaving] winner:"+event["args"].winner);
            $("#game-winner").html("winner: I am the winner!");
            $("#reward-winner").html("reward-winner:"+App.reward);
            $("#game-state").html("game-state: "+6);
            $("#game-turn").html("game-turn: finished");
          }
          if (event["args"].loser == addr) { //i'm the loser
            console.log("[WinforLeaving] winner:"+event["args"].winner);
            $("#game-winner").html("winner: opposite player");
            $("#reward-winner").html("reward-winner:"+App.reward);
            $("#game-state").html("game-state: "+6);
            $("#game-turn").html("game-turn: finished");
          }
        });
        
        instance.isWinner({}, {
          fromBlock: 0,
          toBlock: 'latest'
        }).watch(async function(error, event) {
          if (event["args"].winner == '0x' || event["args"].reward == 0) {
            return;
          }
          if (event["args"].winner == addr) { //i'm the winner
            console.log("[isWinner] winner:"+event["args"].winner+", reward:"+event["args"].reward);
            $("#game-winner").html("winner: I am the winner!");
            $("#reward-winner").html("reward-winner:"+event["args"].reward);
            $("#game-state").html("game-state: "+6);
            $("#game-turn").html("game-turn: finished");
          }
          
          var p1 = await instance.get_player1_battleship.call(Number(event["args"].id), {from: addr});
          var p2 = await instance.get_player2_battleship.call(Number(event["args"].id), {from: addr});

          if ( (p1 == addr && addr != event["args"].winner) || (p2 == addr && addr != event["args"].winner) ) { //i'm the loser
            console.log("[isWinner] winner:"+event["args"].winner+", reward:"+event["args"].reward);
            $("#game-winner").html("winner: opposite player");
            $("#reward-winner").html("reward-winner:"+event["args"].reward);
            $("#game-state").html("game-state: "+6);
            $("#game-turn").html("game-turn: finished");
          }
        });

        //the game is over but the control of the board seems to be incorrect, I then make the opponent win
        instance.CheatWin({}, { //event CheatWin(uint id, address cheater)
          fromBlock: 0,
          toBlock: 'latest'
        }).watch(async function(error, event) {
          var p1 = await instance.get_player1_battleship.call(event["args"].id, {from: addr});
          var p2 = await instance.get_player2_battleship.call(event["args"].id, {from: addr});
          var reward = await instance.get_stake_player.call(event["args"].id, {from: addr});
          if (addr == p1 && p1==event["args"].cheater) {
            $("#game-winner").html("winner: opposite player");
            $("#reward-winner").html("reward-winner:"+reward);
          }
          if (addr == p1 && p2==event["args"].cheater) {
            $("#game-winner").html("winner: I am the winner!");
            $("#reward-winner").html("reward-winner:"+reward);
          }
          if (addr == p2 && p1==event["args"].cheater) {
            $("#game-winner").html("winner: I am the winner!");
            $("#reward-winner").html("reward-winner:"+reward);
          }
          if (addr == p2 && p2==event["args"].cheater) {
            $("#game-winner").html("winner: opposite player");
            $("#reward-winner").html("reward-winner:"+reward);
          }

          console.log("[CheatWin] cheater:"+event["args"].cheater);
        });
           
    });
    App.render();
  },

  debug: function() {
    console.log("board_ship");
    console.log(App.board_ship);

    console.log("M_random");
    console.log(App.M_random)

    console.log("M_final");
    console.log(App.M_final);
  },

  render: function() {
    // Load account data
    web3.eth.getCoinbase(function(err, account) {
      if (err === null) {
        var addr = web3.eth.accounts[0]; //save address account about user that logged in metamask
        //set html info-account
        $("#accountAddress").html("My Address Account: " + addr);
        App.contracts.Battle.deployed().then(async(instance) =>{
          //set html game-id
          var gameid = await instance.get_id_player.call({from: addr});
          App.gameid = Number(gameid);

          if (Number(gameid != -1)) {
            $("#game-id").html("game-id: "+gameid);
          }
          else 
            $("#game-id").html("game-id: No game created");
        });
      }
    });

  }
};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
