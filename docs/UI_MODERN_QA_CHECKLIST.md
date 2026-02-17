# FinFlow UI Modernization QA Checklist

## Visual hierarchy
- Verify top bar is calm: no heavy boxed clusters, File/View/Export are discoverable.
- Verify left library and right inspector use matching header rhythm, spacing, and border treatment.
- Verify borders are subtle and not visually noisy in light and dark themes.

## Canvas clarity
- Verify canvas remains the visual focal point (reduced chrome, softer panel framing).
- Verify node handles are hidden by default and appear on node hover or when selected.
- Verify draw mode chip is compact and does not block node interactions.

## Node and edge polish
- Verify node cards show concise header + max 2-3 chips with no repeated chips.
- Verify selected node state is consistent (accent outline + subtle glow).
- Verify edges are quiet by default, stronger on hover, and clearly highlighted when selected.
- Verify edge labels remain readable but low-noise in default state.

## Lanes and overlays
- Verify swimlane backgrounds are subtle and lane headers are readable.
- Verify lanes do not use heavy borders and still visually separate flow regions.

## Core regression flow
- Create a node from the library by click and by drag-drop.
- Connect two nodes, select the edge, and change edge style/path.
- Select a node and use contextual toolbar: rename, duplicate, delete.
- Export JSON, reset canvas, import JSON, confirm state restoration.
- Reload page and confirm persisted diagram and inspector notes are intact.

## Interaction and accessibility
- Verify keyboard shortcuts still work: `V`, `C`, `T`, `Delete`, `Esc`, `Cmd/Ctrl+K`, `Cmd/Ctrl+Z`.
- Verify focus ring appears on toolbar buttons, menus, sidebar tiles, and inspector inputs.
- Verify controls remain usable at `390px` width without horizontal clipping.
- Verify `Space` pan only activates when the canvas has focus/intent (click canvas first), and does not trigger from sidebar/inspector text fields.

## Trackpad and zoom matrix
- macOS trackpad:
  - Two-finger scroll pans the canvas without selecting nodes.
  - Pinch zooms toward cursor/finger anchor without jump.
  - `Cmd + pinch` keeps zoom stable and clamped.
- Mouse wheel:
  - Wheel pans in both axes on high-precision devices.
  - `Ctrl/Cmd + wheel` zooms toward cursor.
- Zoom controls:
  - Bottom dock `-`, `% menu`, `+`, `100%`, and `Fit` all update camera correctly.
  - Zoom percent text always matches camera zoom after each action.
- Cross-surface safety:
  - Scrolling inside sidebar/inspector does not move canvas.
  - Opening menus/popovers does not steal drag focus from active canvas gestures.

## Performance spot check
- Pan/zoom/drag should remain smooth with dense graph.
- No console errors during add/connect/edit/export/import flow.
