// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract RektPredictionMarket is Ownable, ReentrancyGuard {
    event MarketCreated(uint256 indexed marketId, uint256 startTime, uint256 deadline);
    event MarketSettled(
        uint256 indexed marketId,
        address indexed winner,
        uint256 finalPrice,
        uint256 predictionPrice,
        uint256 totalAmount
    );
    event MarketParticipation(uint256 indexed marketId, address indexed player, uint256 predictionPrice);
    // event PrizeDistributed(uint256 indexed marketId, address indexed player, uint256 totalAmount);
    event WithdrawBalance(address indexed user, uint256 amount);

    struct Market {
        uint256 startTime;
        uint256 deadline;
        uint256 entranceFee;
        uint256 finalPrice; // 0 means not settled yet
        uint256 totalAmount;
        bool settled;
        string name;
        address[] playerAddresses;
        mapping(address => Player) players;
    }

    struct Player {
        uint256 predictionPrice;
        uint256 timestamp;
        bytes32 data;
    }

    enum Phase {
        PREDICTION, // Players place bets
        LOCK, // No new bets allowed, waiting for deadline
        SETTLEMENT // Fetch price, verify, and distribute rewards

    }

    uint256 public constant FEE_PERCENTAGE = 1; // in percent (%)
    uint256 public constant FEE_PRECISION = 100; // for calculation purposes
    // uint256 public accumulatedFees;
    mapping(uint256 => Market) public markets;
    mapping(address => uint256) public balances;

    constructor(address _owner) Ownable(_owner) { }

    // onlyOwner
    function createMarket(
        uint256 marketId,
        uint256 _startTime,
        uint256 _deadline,
        uint256 _participationFee,
        string memory _name
    ) external {
        require(markets[marketId].deadline == 0, "Market already exists");
        require(_startTime < _deadline, "Start time must be before deadline");

        Market storage newMarket = markets[marketId];
        newMarket.startTime = _startTime;
        newMarket.deadline = _deadline;
        newMarket.entranceFee = _participationFee;
        newMarket.finalPrice = 0;
        newMarket.settled = false;
        newMarket.name = _name;

        emit MarketCreated(marketId, _startTime, _deadline);
    }

    function getMarketPhase(uint256 marketId) public view returns (Phase) {
        Market storage market = markets[marketId];
        uint256 predictionEnd = market.startTime + ((market.deadline - market.startTime) / 2);

        if (block.timestamp < predictionEnd) {
            return Phase.PREDICTION;
        } else if (block.timestamp < market.deadline) {
            return Phase.LOCK;
        } else {
            return Phase.SETTLEMENT;
        }
    }

    function participateInMarket(uint256 marketId, uint256 predictionPrice, bytes32 _data) external payable {
        Market storage market = markets[marketId];

        require(getMarketPhase(marketId) == Phase.PREDICTION, "Market is not in prediction phase");
        require(msg.value >= market.entranceFee, "Insufficient entrance fee");
        require(market.players[msg.sender].predictionPrice == 0, "Already participated");

        market.players[msg.sender] = Player({
            predictionPrice: predictionPrice,
            data: keccak256(abi.encodePacked(msg.sender, predictionPrice, _data)), // Optional: for proof verification,
            timestamp: block.timestamp
        });
        uint256 totalAmount = market.totalAmount + market.entranceFee;
        market.totalAmount = totalAmount;
        market.playerAddresses.push(msg.sender);

        emit MarketParticipation(marketId, msg.sender, predictionPrice);
    }

    // onlyOwner
    function settleMarket(uint256 marketId, uint256 _finalPrice) external {
        Market storage market = markets[marketId];

        require(block.timestamp >= market.deadline, "Market is still active");
        require(!market.settled, "Market already settled");

        market.finalPrice = _finalPrice;
        market.settled = true;

        // TODO: Implement winner calculation
        address winner;
        uint256 predictionPrice;
        uint256 closestDifference = type(uint256).max;

        for (uint256 i; i < market.playerAddresses.length;) {
            address playerAddress = market.playerAddresses[i];
            Player storage player = market.players[playerAddress];
            uint256 difference = _finalPrice > player.predictionPrice
                ? _finalPrice - player.predictionPrice
                : player.predictionPrice - _finalPrice;

            if (difference < closestDifference) {
                closestDifference = difference;
                winner = playerAddress;
                predictionPrice = player.predictionPrice;
            }
            unchecked {
                ++i;
            }
        }

        if (winner != address(0)) {
            _prizeDistribution(market, winner);
        }
        emit MarketSettled(marketId, winner, _finalPrice, predictionPrice, market.totalAmount);
    }

    function _prizeDistribution(Market storage _market, address _winner) private nonReentrant {
        // require(!_market.distributed, "Prize already distributed");
        uint256 totalWinnerBalance = balances[_winner];
        uint256 totalAmount = _market.totalAmount + totalWinnerBalance;
        balances[_winner] = totalAmount;
        // _market.distributed = true;
    }

    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }

    function withdrawBalances(uint256 _amount) public nonReentrant {
        require(_amount <= balances[msg.sender], "Insufficient balance");
        balances[msg.sender] -= _amount;
        (bool success,) = msg.sender.call{ value: _amount }("");
        require(success, "Transfer failed");
        emit WithdrawBalance(msg.sender, _amount);
    }

    function getPlayerData(uint256 marketId, address player)
        external
        view
        returns (uint256 predictionPrice, uint256 timestamp, bytes32 data)
    {
        Market storage market = markets[marketId]; // Access the market
        Player storage playerData = market.players[player]; // Access the player

        return (playerData.predictionPrice, playerData.timestamp, playerData.data);
    }

    function getPlayers(uint256 marketId) external view returns (address[] memory playerAddresses) {
        Market storage market = markets[marketId];
        playerAddresses = market.playerAddresses;
    }
}
