// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {FlightMarket} from "../src/FlightMarket.sol";

contract FlightMarketTest is Test {
    FlightMarket public flightMarket;

    //CRE Sepolia Simulation Forwarder
    address internal forwarderAddress =
        address(0x15fC6ae953E024d975e77382eEeC56A9101f9F88);

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    event MarketCreated(
        uint256 indexed marketId,
        string flightId,
        uint256 departTs,
        uint256 thresholdMin,
        uint256 closeTs
    );

    event PositionBought(
        uint256 indexed marketId,
        address indexed user,
        bool yes,
        uint256 amount
    );

    event SettlementRequested(
        uint256 indexed marketId,
        string flightId,
        uint256 departTs,
        uint256 thresholdMin
    );
    function setUp() public {
        flightMarket = new FlightMarket(forwarderAddress);
    }

    function testCreateFlightMarket() public {
        // -------------------------------------------------------------------------
        // Create a flight market
        // -------------------------------------------------------------------------
        string memory flightId = "AA123";
        uint256 departTs = block.timestamp + 1 days;
        uint32 thresholdMin = 100;
        uint256 closeTs = block.timestamp + 12 hours;

        vm.expectEmit(true, false, false, true);
        emit MarketCreated(1, flightId, departTs, thresholdMin, closeTs);

        uint256 marketId = flightMarket.createMarket(
            flightId,
            departTs,
            thresholdMin,
            closeTs
        );

        assertEq(marketId, 1);

        // -------------------------------------------------------------------------
        // Buy a yes share
        // -------------------------------------------------------------------------
        uint256 amount = 0.1 ether;

        vm.deal(alice, amount);
        vm.deal(bob, amount);

        vm.prank(bob);
        flightMarket.buyNo{value: amount}(marketId);

        vm.startPrank(alice);

        vm.expectEmit(true, false, false, true);
        emit PositionBought(marketId, alice, true, amount);

        flightMarket.buyYes{value: amount}(marketId);

        (uint256 yesAmount, uint256 noAmount, bool hasClaimed) = flightMarket
            .getUserPosition(marketId, alice);

        assertEq(yesAmount, amount);
        assertEq(noAmount, 0);
        assertEq(hasClaimed, false);

        (
            ,
            ,
            ,
            ,
            uint256 yesPool,
            uint256 noPool,
            ,
            bool resolved,
            bool delayed,
            uint256 delayMinutes,

        ) = flightMarket.getMarket(marketId);

        assertEq(yesPool, amount);
        assertEq(noPool, amount);
        assertEq(resolved, false);
        assertEq(delayed, false);
        assertEq(delayMinutes, 0);

        // -------------------------------------------------------------------------
        // Request settlement
        // -------------------------------------------------------------------------
        vm.warp(block.timestamp + 30 days);

        vm.expectEmit(true, false, false, true);
        emit SettlementRequested(marketId, flightId, departTs, thresholdMin);

        flightMarket.requestSettlement(marketId);
        
        // -------------------------------------------------------------------------
        // CRE running
        // -------------------------------------------------------------------------

        flightMarket.setMarketResolved(marketId);
        // -------------------------------------------------------------------------
        // Claim
        // -------------------------------------------------------------------------

        flightMarket.claim(marketId);

        vm.stopPrank();
    }
}
