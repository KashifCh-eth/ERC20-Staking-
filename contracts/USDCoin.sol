// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDCoin is ERC20 {
    constructor() ERC20("USDCoin", "USDC") {
        _mint(msg.sender, 5000 * 10 ** 18);
    }
}
