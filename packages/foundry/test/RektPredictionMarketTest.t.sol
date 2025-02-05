// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../contracts/RektPredictionMarket.sol";

contract RektPredictionMarketTest is Test {
    RektPredictionMarket public predictionMarket;

    address owner = makeAddr("owner");
    uint256 marketId = 1;
    uint256 participationFee = 1 ether;

    function setUp() public {
        predictionMarket = new RektPredictionMarket(owner);
    }

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

    function testCreateMarket() public {
        uint256 startTime = block.timestamp;
        uint256 deadline = block.timestamp + 1 days;
        string memory marketName = "BTC";

        predictionMarket.createMarket(marketId, startTime, deadline, participationFee, marketName);

        (uint256 storedStartTime, uint256 storedDeadline, uint256 storedEntranceFee,,, bool settled,) =
            predictionMarket.markets(marketId);

        assertEq(storedStartTime, startTime);
        assertEq(storedDeadline, deadline);
        assertEq(storedEntranceFee, participationFee);
        assertFalse(settled);
    }

    modifier createMarket() {
        uint256 startTime = block.timestamp;
        uint256 deadline = block.timestamp + 1 days;
        string memory marketName = "BTC";

        predictionMarket.createMarket(marketId, startTime, deadline, participationFee, marketName);
        _;
    }

    function testParticipateInMarket() public createMarket {
        address player = address(1);
        uint256 predictionPrice = 1000;
        bytes32 data = keccak256(abi.encodePacked("Some important data"));

        vm.prank(player);
        vm.deal(player, 2 ether);
        predictionMarket.participateInMarket{ value: participationFee }(marketId, predictionPrice, data);

        (uint256 storedPredictionPrice,, bytes32 storedData) = predictionMarket.getPlayerData(marketId, player);

        assertEq(storedPredictionPrice, predictionPrice);
        assertEq(storedData, keccak256(abi.encodePacked(player, predictionPrice, data)));
    }

    function testGetMarketPhase() public createMarket {
        uint256 startTime = block.timestamp;
        uint256 deadline = startTime + 1 days;

        // Test during PREDICTION phase
        vm.warp(startTime + (deadline - startTime) / 4);
        assertEq(uint256(predictionMarket.getMarketPhase(marketId)), uint256(RektPredictionMarket.Phase.PREDICTION));

        // Test during LOCK phase
        vm.warp(startTime + (deadline - startTime) * 3 / 4);
        assertEq(uint256(predictionMarket.getMarketPhase(marketId)), uint256(RektPredictionMarket.Phase.LOCK));

        // Test during SETTLEMENT phase
        vm.warp(deadline + 1);
        assertEq(uint256(predictionMarket.getMarketPhase(marketId)), uint256(RektPredictionMarket.Phase.SETTLEMENT));
    }

    function testSettleMarketWithoutPlayers() public createMarket {
        uint256 startTime = block.timestamp;
        uint256 deadline = startTime + 1 days;
        uint256 finalPrice = 1500;

        vm.warp(deadline + 1);

        vm.expectEmit(true, true, false, false, address(predictionMarket));
        emit MarketSettled(marketId, address(0), finalPrice, 0, 0);
        predictionMarket.settleMarket(marketId, finalPrice);

        (,,,, uint256 storedTotalAmount, bool settled,) = predictionMarket.markets(marketId);

        assertEq(storedTotalAmount, 0);
        assertTrue(settled);
    }

    function testSettleMarketWithPlayers() public createMarket {
        uint256 startTime = block.timestamp;
        uint256 deadline = startTime + 1 days;
        uint256 finalPrice = 1500;
        uint16 predictedPrice = uint16(finalPrice - 1);
        address winner = address(0x3);
        bytes32 data = keccak256(abi.encodePacked("Some important data"));

        address[5] memory players = [address(0x1), address(0x2), winner, address(0x4), address(0x5)];
        uint16[5] memory predictionPrices = [1400, 1450, predictedPrice, 1550, 1600];
        uint256 expectedPrizeAmount = participationFee * players.length;

        for (uint256 i = 0; i < players.length; i++) {
            vm.deal(players[i], 2 ether);
            vm.prank(players[i]);
            predictionMarket.participateInMarket{ value: participationFee }(
                marketId, uint256(predictionPrices[i]), data
            );
        }

        vm.warp(deadline + 1);
        vm.expectEmit(true, true, false, false, address(predictionMarket));
        emit MarketSettled(marketId, winner, finalPrice, predictedPrice, expectedPrizeAmount);

        predictionMarket.settleMarket(marketId, finalPrice);

        (,,,, uint256 storedTotalAmount, bool settled,) = predictionMarket.markets(marketId);
        (uint256 winnerBalance) = predictionMarket.getBalance(winner);

        assertEq(storedTotalAmount, expectedPrizeAmount);
        assertTrue(settled);
        assertEq(winnerBalance, expectedPrizeAmount);
    }
}
