var Battle = artifacts.require("../contracts/BattleShips.sol");
var MT = artifacts.require("../contracts/MT.sol");
var SafeMath = artifacts.require("../contracts/SafeMath.sol");


module.exports = function(instance) {
  instance.deploy(MT);
  instance.deploy(SafeMath);
  instance.link(MT, Battle);
  instance.link(SafeMath, Battle);
  instance.deploy(Battle);
};