// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

//** @todo
contract FlightMarket is ReentrancyGuard, Ownable {
    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    /// @dev Trading must close at least this many seconds before scheduled departure.
    uint256 public constant TRADING_CUTOFF_SECONDS = 2 hours;

    /// @dev Per-wallet max stake (across YES+NO) per market.
    uint256 public constant MAX_STAKE_PER_WALLET_PER_MARKET = 2 ether;

    /// @dev Per-market max total pool size (YES+NO).
    uint256 public constant MAX_TOTAL_POOL_PER_MARKET = 50 ether;

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error NotOwner();
    error ZeroValue();
    error MarketNotFound();
    error MarketClosed();
    error MarketNotClosed();
    error MarketAlreadyResolved();
    error SettlementAlreadyRequested();
    error InvalidCloseTime();
    error StakeCapExceeded();
    error PoolCapExceeded();
    error OnlyForwarder();
    error BadReport();
    error NothingToClaim();

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

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

    event MarketResolved(
        uint256 indexed marketId,
        bool delayed,
        uint256 delayMinutes,
        bytes32 evidenceHash
    );

    event Claimed(
        uint256 indexed marketId,
        address indexed user,
        uint256 payout
    );

    event ForwarderUpdated(
        address indexed oldForwarder,
        address indexed newForwarder
    );

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    struct Market {
        string flightId;
        uint256 departTs;
        uint256 closeTs;
        uint256 thresholdMin;
        uint256 yesPool;
        uint256 noPool;
        uint256 settlementRequestedTs;
        bool resolved;
        bool delayed;
        uint256 delayMinutes;
        bytes32 evidenceHash;
    }

    address public forwarder;

    uint256 public nextMarketId = 1;
    
    mapping(uint256 => Market) private markets;
    mapping(uint256 => mapping(address => uint256)) public yesStake;
    mapping(uint256 => mapping(address => uint256)) public noStake;
    mapping(uint256 => mapping(address => bool)) public claimed;

    // -------------------------------------------------------------------------
    // Constructor / Admin
    // -------------------------------------------------------------------------

    constructor(address _forwarder) Ownable(msg.sender){
        forwarder = _forwarder;
    }

    function setForwarder(address _forwarder) external onlyOwner {
        address old = forwarder;
        forwarder = _forwarder;
        emit ForwarderUpdated(old, _forwarder);
    }

    // -------------------------------------------------------------------------
    // Market creation & views
    // -------------------------------------------------------------------------

    function createMarket(
        string calldata flightId,
        uint256 departTs,
        uint256 thresholdMin,
        uint256 closeTs
    ) external returns (uint256 marketId) {
        if (bytes(flightId).length == 0) revert InvalidCloseTime();
        if (thresholdMin == 0) revert InvalidCloseTime();

        // Must close before departure, and at least cutoff before departure.
        // Also must be in the future.
        if (closeTs <= uint256(block.timestamp)) revert InvalidCloseTime();
        if (closeTs >= departTs) revert InvalidCloseTime();
        if (departTs <= uint256(block.timestamp)) revert InvalidCloseTime();

        uint256 cutoffOkAfter = uint256(departTs) - TRADING_CUTOFF_SECONDS;
        if (uint256(closeTs) > cutoffOkAfter) revert InvalidCloseTime();

        marketId = nextMarketId++;
        Market storage m = markets[marketId];

        m.flightId = flightId;
        m.departTs = departTs;
        m.thresholdMin = thresholdMin;
        m.closeTs = closeTs;

        emit MarketCreated(marketId, flightId, departTs, thresholdMin, closeTs);
    }

    function getMarket(
        uint256 marketId
    )
        external
        view
        returns (
            string memory flightId,
            uint256 departTs,
            uint256 thresholdMin,
            uint256 closeTs,
            uint256 yesPool,
            uint256 noPool,
            uint256 settlementRequestedTs,
            bool resolved,
            bool delayed,
            uint256 delayMinutes,
            bytes32 evidenceHash
        )
    {
        Market storage m = markets[marketId];
        if (m.departTs == 0) revert MarketNotFound();

        return (
            m.flightId,
            m.departTs,
            m.thresholdMin,
            m.closeTs,
            m.yesPool,
            m.noPool,
            m.settlementRequestedTs,
            m.resolved,
            m.delayed,
            m.delayMinutes,
            m.evidenceHash
        );
    }

    function getUserPosition(
        uint256 marketId,
        address user
    )
        external
        view
        returns (uint256 yesAmount, uint256 noAmount, bool hasClaimed)
    {
        yesAmount = yesStake[marketId][user];
        noAmount = noStake[marketId][user];
        hasClaimed = claimed[marketId][user];
    }

    // -------------------------------------------------------------------------
    // Trading
    // -------------------------------------------------------------------------

    function buyYes(uint256 marketId) external payable {
        _buy(marketId, true);
    }

    function buyNo(uint256 marketId) external payable {
        _buy(marketId, false);
    }

    function _buy(uint256 marketId, bool yes) internal {
        if (msg.value == 0) revert ZeroValue();

        Market storage m = markets[marketId];
        if (m.departTs == 0) revert MarketNotFound();
        if (m.resolved) revert MarketAlreadyResolved();
        if (uint256(block.timestamp) >= m.closeTs) revert MarketClosed();

        // Enforce per-wallet cap across both sides
        uint256 current = yesStake[marketId][msg.sender] +
            noStake[marketId][msg.sender];
        if (current + msg.value > MAX_STAKE_PER_WALLET_PER_MARKET)
            revert StakeCapExceeded();

        // Enforce total pool cap
        uint256 totalAfter = m.yesPool + m.noPool + msg.value;
        if (totalAfter > MAX_TOTAL_POOL_PER_MARKET) revert PoolCapExceeded();

        if (yes) {
            yesStake[marketId][msg.sender] += msg.value;
            m.yesPool += msg.value;
        } else {
            noStake[marketId][msg.sender] += msg.value;
            m.noPool += msg.value;
        }

        emit PositionBought(marketId, msg.sender, yes, msg.value);
    }

    // -------------------------------------------------------------------------
    // Settlement request (emits log for CRE)
    // -------------------------------------------------------------------------

    function requestSettlement(uint256 marketId) external {
        Market storage m = markets[marketId];
        if (m.departTs == 0) revert MarketNotFound();
        if (m.resolved) revert MarketAlreadyResolved();
        if (uint256(block.timestamp) < m.closeTs) revert MarketNotClosed();
        if (m.settlementRequestedTs != 0) revert SettlementAlreadyRequested();

        m.settlementRequestedTs = block.timestamp;

        emit SettlementRequested(
            marketId,
            m.flightId,
            m.departTs,
            m.thresholdMin
        );
    }

    // -------------------------------------------------------------------------
    // CRE secure write receiver
    // -------------------------------------------------------------------------

    function onReport(
        bytes calldata /*metadata*/,
        bytes calldata report
    ) external {
        if (msg.sender != forwarder) revert OnlyForwarder();

        // report can be either:
        //  - abi.encode(uint256 marketId, bool delayed)                         => 64 bytes
        //  - abi.encode(uint256 marketId, bool delayed, uint256 delay, bytes32 hash) => 128 bytes
        uint256 marketId;
        bool delayed;
        uint256 delayMinutes;
        bytes32 evidenceHash;

        if (report.length == 64) {
            (marketId, delayed) = abi.decode(report, (uint256, bool));
            delayMinutes = 0;
            evidenceHash = bytes32(0);
        } else if (report.length == 128) {
            (marketId, delayed, delayMinutes, evidenceHash) = abi.decode(
                report,
                (uint256, bool, uint256, bytes32)
            );
        } else {
            revert BadReport();
        }

        Market storage m = markets[marketId];
        if (m.departTs == 0) revert MarketNotFound();
        if (m.resolved) revert MarketAlreadyResolved();

        // Optional: require settlement requested first
        if (m.settlementRequestedTs == 0) revert BadReport();

        m.resolved = true;
        m.delayed = delayed;
        m.delayMinutes = delayMinutes;
        m.evidenceHash = evidenceHash;

        emit MarketResolved(marketId, delayed, delayMinutes, evidenceHash);
    }

    // -------------------------------------------------------------------------
    // Claims
    // -------------------------------------------------------------------------

    function claim(
        uint256 marketId
    ) external nonReentrant returns (uint256 payout) {
        Market storage m = markets[marketId];
        if (m.departTs == 0) revert MarketNotFound();
        if (!m.resolved) revert MarketNotClosed(); // reuse error: not resolved yet
        if (claimed[marketId][msg.sender]) revert NothingToClaim();

        uint256 y = yesStake[marketId][msg.sender];
        uint256 n = noStake[marketId][msg.sender];

        if (y == 0 && n == 0) revert NothingToClaim();

        claimed[marketId][msg.sender] = true;
        yesStake[marketId][msg.sender] = 0;
        noStake[marketId][msg.sender] = 0;

        if (m.delayed) {
            // YES is correct
            if (m.yesPool == 0) {
                // No YES bettors exist; refund NO bettors (no winners scenario).
                payout = n;
            } else {
                if (y > 0) {
                    payout = y + (y * m.noPool) / m.yesPool;
                } else {
                    payout = 0;
                }
            }
        } else {
            // NO is correct
            if (m.noPool == 0) {
                // No NO bettors exist; refund YES bettors (no winners scenario).
                payout = y;
            } else {
                if (n > 0) {
                    payout = n + (n * m.yesPool) / m.noPool;
                } else {
                    payout = 0;
                }
            }
        }

        if (payout == 0) revert NothingToClaim();

        (bool ok, ) = msg.sender.call{value: payout}("");
        require(ok, "TRANSFER_FAILED");

        emit Claimed(marketId, msg.sender, payout);
    }

    // -------------------------------------------------------------------------
    // Convenience views
    // -------------------------------------------------------------------------

    function isOpen(uint256 marketId) external view returns (bool) {
        Market storage m = markets[marketId];
        if (m.departTs == 0) return false;
        return (!m.resolved) && (uint256(block.timestamp) < m.closeTs);
    }

    function totalPool(uint256 marketId) external view returns (uint256) {
        Market storage m = markets[marketId];
        if (m.departTs == 0) revert MarketNotFound();
        return m.yesPool + m.noPool;
    }

    receive() external payable {}
}
