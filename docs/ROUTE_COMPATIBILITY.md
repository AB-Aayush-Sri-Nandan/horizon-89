# Navigation and route compatibility

The visible header now has one primary navigation row. Old hashes remain
addressable so existing bookmarks do not fail. The command search lists all
destinations, including legacy views that are no longer in the header.

| Current header destination | Hash | Related retained routes |
| --- | --- | --- |
| Home | `#platform-home` | `#home` retains the earlier interactive preview |
| Solar System | `#solar-atlas` | `#solar`, `#solar-overview` retain the earlier overview |
| Moon Explorer | `#moon` | — |
| Missions | `#missions` | `#research-missions` |
| Mission control | `#mission-control` | — |
| Landing Lab | `#lab` | — |
| Knowledge Graph | `#graph` | — |
| Operations overview | `#control` | — |
| Horizon Intelligence | `#copilot` | — |
| Lunar science | `#lunar-science` | — |
| CLPS intelligence | `#clps-intelligence` | — |

The two older Home and Solar views remain separate because they have useful
interactions. They have been removed from the visible navigation to avoid two
Home and Solar entries, but their content has not yet been merged into the
canonical experiences. Removing them safely remains architectural work.
Lunar Science and CLPS Intelligence remain visible in the horizontally
scrollable header because their mission-platform workflows are still distinct.
