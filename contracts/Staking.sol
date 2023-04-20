// SPDX-License-Identifier:  MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol"; // Transfor & Transfor from

contract Staking {
    address public owner;
    uint public currentTokenId = 1;

    struct Token {
        uint tokenId;
        string name;
        string symbol;
        address tokenAddress;
        uint usdPrice;
        uint ethPrice;
        uint apy;
    }

    struct Position {
        uint positionId;
        address walletAddress;
        string name;
        string symbol;
        uint createDate;
        uint apy;
        uint tokenQuantity;
        uint usdValue;
        uint ethValue;
        bool open;
    }

    uint public ethUsdPrice;
    string[] public tokenSymbols;
    mapping(string => Token) public tokens;

    uint public currentPositionId = 1;

    mapping(uint => Position) public positions;
    mapping(address => uint[]) public positionIdsbyAddress;
    mapping(string => uint) public stakedToken;

    constructor(uint _ethusdPrice) payable {
        ethUsdPrice = _ethusdPrice;
        owner = msg.sender;
    }

    function addToken(
        string calldata name,
        string calldata symbol,
        address tokenAddress,
        uint usdPrice,
        uint apy
    ) external onlyOwner {
        tokenSymbols.push(symbol);
        tokens[symbol] = Token(
            currentTokenId,
            name,
            symbol,
            tokenAddress,
            usdPrice,
            usdPrice / ethUsdPrice,
            apy
        );

        currentTokenId++;
    }

    function getTokenSymbols() public view returns (string[] memory) {
        return tokenSymbols;
    }

    function getToken(
        string calldata _tokenSymbols
    ) public view returns (Token memory) {
        return tokens[_tokenSymbols];
    }

    function stakedTokens(
        string calldata _tokensymbol,
        uint _tokenQuantity
    ) external {
        require(
            tokens[_tokensymbol].tokenId != 0,
            "THIS TOKEN CONT' BE STAKED! "
        );
        IERC20(tokens[_tokensymbol].tokenAddress).transferFrom(
            msg.sender,
            address(this),
            _tokenQuantity
        );

        positions[currentPositionId] = Position(
            currentPositionId,
            msg.sender,
            tokens[_tokensymbol].name,
            _tokensymbol,
            block.timestamp,
            tokens[_tokensymbol].apy,
            _tokenQuantity,
            tokens[_tokensymbol].usdPrice * _tokenQuantity,
            (tokens[_tokensymbol].usdPrice * _tokenQuantity) / ethUsdPrice,
            true
        );
        positionIdsbyAddress[msg.sender].push(currentPositionId);
        currentPositionId++;
        stakedToken[_tokensymbol] += _tokenQuantity;
    }

    function getPositionIdsForAddress() external view returns (uint[] memory) {
        return positionIdsbyAddress[msg.sender];
    }

    function getPositionById(
        uint _positionId
    ) external view returns (Position memory) {
        return positions[_positionId];
    }

    // _apy is Interest , _value is total value of postition ,
    function calculateInterest(
        uint _apy,
        uint _value,
        uint _numberofDays
    ) public pure returns (uint) {
        return (_apy * _value * _numberofDays) / 10000 / 365;
    }

    function calculateNumberDays(uint _createdDays) public view returns (uint) {
        //substrate cuurent time with createDate And divided to
        // 60 second in 1 mint and 60 mints in 1 hour and 24 hour in one day
        return (block.timestamp - _createdDays) / 60 / 60 / 24;
    }

    function closePosition(uint _positionId) external {
        require(
            positions[_positionId].walletAddress == msg.sender,
            "NOT THE OWNER OF THIS POSITION!"
        );

        require(
            positions[_positionId].open == true,
            "POSITION IS ALREADY CLOSED!!!"
        );
        positions[_positionId].open = false;
        IERC20(tokens[positions[_positionId].symbol].tokenAddress).transfer(
            msg.sender,
            positions[_positionId].tokenQuantity
        );
        uint numberDays = calculateNumberDays(
            positions[_positionId].createDate
        );
        uint weiAmount = calculateInterest(
            positions[_positionId].apy,
            positions[_positionId].ethValue,
            numberDays
        );

        (bool hs, ) = payable(msg.sender).call{value: weiAmount}("");
        require(hs);
    }

    function modifyCreatedDate(
        uint _positionId,
        uint _newCreatedDate
    ) external onlyOwner {
        positions[_positionId].createDate = _newCreatedDate;
    }

    modifier onlyOwner() {
        require(owner == msg.sender, "NOT OWNER!");
        _;
    }
}
