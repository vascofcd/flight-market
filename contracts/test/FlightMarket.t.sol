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

    function setUp() public {
        flightMarket = new FlightMarket(forwarderAddress);
    }

    function testCreateFlightMarket() public {
        string memory flightId = "AA123";
        uint256 departTs = block.timestamp + 1 days;
        uint32 thresholdMin = 100;
        uint256 closeTs = block.timestamp + 12 hours;

        vm.expectEmit(true, false, false, true);
        emit MarketCreated(1, flightId, departTs, thresholdMin, closeTs);

        flightMarket.createMarket(flightId, departTs, thresholdMin, closeTs);
    }
}
