# Contract Tests

This directory owns shared mutation/continuation receipt contracts.

These tests verify that Runtime producers, Control continuation logic, and shared receipt schemas use the same canonical contract owners. They are intentionally separate from broader runtime behavior and repository-structure tests.

The affected-execution planner maps `mcp/lib/receipts/*` changes directly to the minimum contract set in this directory.
