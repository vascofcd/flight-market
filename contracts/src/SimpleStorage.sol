// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleStorage {
    uint256 public value;

    constructor(uint256 initialValue) {
        value = initialValue;
    }

    function get() public view returns (uint256) {
        return value;
    }
}
