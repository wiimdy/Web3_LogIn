// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC721URIStorage, ERC721} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title AttendanceNFT - 출석 인증을 위한 간단한 ERC721
/// @notice 서버(관리자) 지갑만 민팅할 수 있으며, 토큰 URI는 민팅 시 지정합니다.
contract AttendanceNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 public nextTokenId = 1;

    event AttendanceMinted(address indexed to, uint256 indexed tokenId, string tokenURI);

    constructor(string memory name_, string memory symbol_)
        ERC721(name_, symbol_)
        Ownable(msg.sender)
    {}

    /// @notice 출석 NFT를 민팅합니다. onlyOwner
    function mintAttendance(address to, string memory tokenURI) external onlyOwner returns (uint256) {
        uint256 tokenId = nextTokenId;
        nextTokenId++;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);

        emit AttendanceMinted(to, tokenId, tokenURI);
        return tokenId;
    }

    // --- Overrides required by Solidity for multiple inheritance ---
    // function _burn(uint256 tokenId) internal  {
    //     super._burn(tokenId);
    // }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
