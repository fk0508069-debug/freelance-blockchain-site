// lib/contracts.ts
import { parseAbi } from 'viem';

// ✅ These now pull the real addresses from your .env file
export const MOCK_USDT_ADDRESS = process.env.NEXT_PUBLIC_MOCK_USDT_ADDRESS as `0x${string}`;
export const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_ADDRESS as `0x${string}`;

export const MOCK_USDT_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function mint(address to, uint256 amount)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function transfer(address to, uint256 amount) returns (bool)" // ✅ Add this line
]);

export const ESCROW_ABI = parseAbi([
  "function fundOrder(uint256 _orderId, address _seller, uint256 _amount)",
  "function releaseFunds(uint256 _orderId)",
  "function orders(uint256) view returns (address buyer, address seller, uint256 amount, bool isFunded, bool isCompleted, bool isRefunded)",
  "event OrderFunded(uint256 indexed orderId, address buyer, address seller, uint256 amount)",
  "event OrderCompleted(uint256 indexed orderId, uint256 sellerAmount, uint256 commission)"
]);

