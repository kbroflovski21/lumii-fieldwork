# Fieldwork Mockup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a quick production-ready static mockup for the complete Lumii Fieldwork business flow and deploy it to staging port 3004.

**Architecture:** Create a static artifact under `deploy/current/` with one HTML file, one CSS file, and one JS file. The app uses local mock state to switch roles, progress the business flow, show role-specific surfaces, and toggle hidden discussion panels.

**Tech Stack:** Plain HTML, CSS, and JavaScript served by the existing staging static Node server defined in `docs/deploy-guide.md`.

---

## File Structure

- Create `deploy/current/index.html`: static app shell, role login, view containers, and script/style references.
- Create `deploy/current/styles.css`: responsive production UI styling for desktop workstations and H5 preview.
- Create `deploy/current/app.js`: mock data, role routing, flow state, confirmation interactions, and discussion-mode toggles.
- Modify `docs/todos.md`: mark that the first mockup implementation has started.

## Task 1: Static App Skeleton

- [ ] Create `deploy/current/index.html` with role login, application root, discussion toggle, and empty content containers.
- [ ] Create `deploy/current/styles.css` with the base layout, typography, buttons, cards, and responsive shell.
- [ ] Create `deploy/current/app.js` with initial role selection and view rendering.
- [ ] Verify locally with `python3 -m http.server 4173 --directory deploy/current` and `curl -I http://127.0.0.1:4173/`.

## Task 2: Business Flow Mock State

- [ ] Add production-like fake data for station, elderly clients, social workers, service requests, visits, exceptions, and evidence packages.
- [ ] Add flow state transitions for triage, scheduling, dispatch, service start, exception escalation, service record submission, QA review, and credential audit.
- [ ] Add confirmation modals for high-consequence actions.
- [ ] Verify that each primary action changes visible state.

## Task 3: Role-Specific Production Surfaces

- [ ] Implement station / operations multi-Agent front page.
- [ ] Implement Management Agent workstation for triage, scheduling, dispatch, and exception handling.
- [ ] Implement Social Worker H5 surface for task, hint, SOP, exception, and service record.
- [ ] Implement QA / credential audit surface for service record, evidence gaps, audit actions, and export confirmation.
- [ ] Verify that each role sees only its relevant production UI.

## Task 4: Discussion Mode

- [ ] Add a hidden discussion panel for each main surface.
- [ ] Include PRD matrix item, flow coverage, role, interacting Agent, permission boundary, and source docs.
- [ ] Verify production mode does not show design labels until discussion mode is toggled.

## Task 5: Staging Deployment

- [ ] Run local static verification.
- [ ] Deploy `deploy/current/` to `ubuntu@124.221.48.52:/home/ubuntu/lumii-fieldwork/deploy/current/` with rsync.
- [ ] Ensure the staging server is running on port 3004 using the guide in `docs/deploy-guide.md`.
- [ ] Verify `http://124.221.48.52:3004/` returns the mockup.
- [ ] Commit implementation and push `main`.
