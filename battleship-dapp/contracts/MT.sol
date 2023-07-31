// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;
pragma experimental ABIEncoderV2;
import "@openzeppelin/contracts/utils/Strings.sol";

library MT {

    using Strings for uint256;

    function get_totalships (uint n) external pure returns (uint) {
        require(n>0 && n%2==0 && n<=10);
        if (n==2) return 1;
        if (n==4) return 4;
        if (n==6) return 10;
        if (n==8) return 13;
        return 16; //n=10
    }

    function check_ships (int[] memory board_ship, uint n) external pure returns (bool) {
        uint ship; 
        uint dim_ship;
        uint ship_1 = 0;
        uint ship_2 = 0;
        uint ship_3 = 0;

        for (uint i=0;i<n*n;i++) {
            if (board_ship[i]!=-1) {
                ship = uint(board_ship[i]);
                board_ship[i] = -1;
                dim_ship=1;
                //slide x (scorro x)
                uint last_row_index = last_index_row(i, n);
                for (uint j=i+1;j<=last_row_index;j++) {
                  if (ship == uint(board_ship[j])) {
                      dim_ship++;
                      board_ship[j] = -1;
                  }
                  else break;
                }
            if (dim_ship>1) { //i found the ship
                if (dim_ship == 2) {
                    ship_2++;
                }
                if (dim_ship == 3) {
                    ship_3++;
                }
            }
            if (dim_ship==1) { //check if the boat is vertical
                //slide y (scorro y)
                uint last_column_index = n * (n - 1) + i % n;
                for (uint j=i+n; j<=last_column_index; j += n) {
                    if (ship == uint(board_ship[j])) {
                        dim_ship++;
                        board_ship[j] = -1;
                    } else break;
                }
                if (dim_ship == 1) {
                    ship_1++;
                }
                if (dim_ship == 2) {
                    ship_2++;
                }
                if (dim_ship == 3) {
                    ship_3++;
                }
            }
            } 
        }

        //check if the number of ships is correct
        if (n==2) {
          if (ship_1 == 1 && ship_2 == 0 && ship_3 == 0)
            return true;
        }
        if (n==4) {
          if (ship_1 == 2 && ship_2 == 1 && ship_3 == 0)
            return true;
        }
        if (n==6)  {
          if (ship_1 == 3 && ship_2 == 2 && ship_3 == 1)
            return true;
        }
        if (n==8) {
          if (ship_1 == 4 && ship_2 == 3 && ship_3 == 1)
            return true;
        }
        if (n==10) {
          if (ship_1 == 5 && ship_2 == 4 && ship_3 == 1)
            return true;
        }

        return false;
    }

    //return the last index of the row of index "id_cell"
    function last_index_row (uint id_cell, uint n) internal pure returns (uint) {
      uint [] memory last_row = new uint[] (n);
      uint tmp = n-1;
      uint row;
      //compute last_row: contain last index of all the row
      for (uint i=0;i<n;i++) {
        last_row[i] = tmp;
        tmp = tmp + n;
      }

      for (uint i=0;i<n;i++) {
        if (id_cell<=last_row[i]) {
          row = last_row[i];
          break;
        }
      }

      return row;
    }

    function intToString(uint _value) internal pure returns (string memory) {
        return _value.toString();
    }

    function intArrayTostringArray(uint[] memory _int) public pure returns (string[] memory){
        uint length = _int.length;
        string[] memory stringArray = new string[](length);
        for (uint i=0;i<length;i++) {
            stringArray[i] = Strings.toString(_int[i]);
        }
        
        return stringArray;
    }

    function compareStrings(string calldata a, string calldata b) external pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }

    function calculateRoot(int[] memory board, uint[] memory random_board) public pure returns (bytes32) {
        //I transform the board_ship matrix into the board_1 matrix
        for (uint i=0;i<board.length;i++) {
          if (board[i] == -1)
            board[i] = 0;
          else board[i] = 1;
        }

        //create final board
        string[] memory final_board = new string[](board.length);
        for (uint i=0;i<board.length;i++) {
          string memory tmp1 = intToString(uint(board[i]));
          string memory tmp2 = intToString(random_board[i]);
          final_board[i] = string(abi.encodePacked(tmp1, tmp2));
        }

        return computeRoot(final_board);
    }

    function computeRoot(string[] memory data) internal pure returns (bytes32) {
        require(data.length > 0, "Data must not be empty");
        bytes32[] memory leaves = new bytes32[](data.length);
        for (uint i = 0; i < data.length; i++) {
            bytes32 leaf = keccak256(abi.encodePacked(data[i])); //keccak256 function takes in any amount of inputs and converts it to a unique 32 byte hash.
            leaves[i] = leaf;
        }

        while (leaves.length > 1) {
            bytes32[] memory parents = new bytes32[](leaves.length / 2);
            for (uint i = 0; i < leaves.length; i += 2) {
                bytes32 parent = keccak256(abi.encodePacked(leaves[i], leaves[i + 1]));
                parents[i / 2] = parent;
            }
            leaves = parents;
        }

        return leaves[0];
    }

  function verify(bytes32 root, bytes32 leaf, bytes32[] memory proof, uint256[] memory positions) public pure returns (bool) {
      bytes32 computedHash = leaf;

      for (uint256 i = 0; i < proof.length; i++) {
        bytes32 proofElement = proof[i];

        if (positions[i] == 1) { //right leaf proof
          computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
        } else { //left leaf proof
          computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
        }
      }

    return computedHash == root;
  }

}