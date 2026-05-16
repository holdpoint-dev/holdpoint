# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Builder: List view** — second view mode in the visual builder that displays `checks.yaml` as hook sections (grouped by `on` hook, then by `when` filter). Toggle between Graph and List views via the toolbar icon buttons.
- **Builder: List view editing** — checks can be created, edited, and deleted directly from the list view without switching to the graph canvas. Edit dialog supports label, type (cmd/prompt), command/prompt content, file filter (`when`), and condition ID. Changing `when` automatically rewires the graph edges. Delete requires a two-step confirmation.
- **Builder: Add check from list view** — "Add" button on each hook section and filter sub-header creates a new check node pre-scoped to the correct trigger and filter group.
- **`getCheckEntries`** exported from `@sentinel/builder` store — single-pass function returning checks with their canvas node IDs for bidirectional list↔graph sync.
- **`updateCheckNode`** store action — atomically updates check content, type, and filter rewiring in one operation.
- **`addCheckToGroup`** store action — creates a check node connected to the correct trigger/filter, creating those nodes if absent.
