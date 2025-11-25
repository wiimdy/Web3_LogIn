// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {AttendanceNFT} from "../src/AttendanceNFT.sol";

/// @notice forge script script/DeployAttendanceNFT.s.sol --rpc-url $RPC_URL --broadcast
contract DeployAttendanceNFT is Script {
    function run() external {
        // 필요한 env: PK(배포자 프라이빗키), NFT_NAME, NFT_SYMBOL
        uint256 deployerKey = vm.envUint("PK");
        string memory name = vm.envOr("NFT_NAME", string("Attendance NFT"));
        string memory symbol = vm.envOr("NFT_SYMBOL", string("ATTN"));

        vm.startBroadcast(deployerKey);
        AttendanceNFT nft = new AttendanceNFT(name, symbol);
        vm.stopBroadcast();

        console2.log("AttendanceNFT deployed at", address(nft));
    }
}
