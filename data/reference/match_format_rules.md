# Match format rules

Provided by the user 2026-09-02, from the Challengers ruleset. Not yet enforced in code -
kept here for (1) a validation pass over the seeded match-map data once seeding is
confirmed clean, and (2) labeling on the eventual Match page (LAN vs Online, Best-of-X).

## Event type -> venue

- **Major/Open and Champs** = LAN events.
- **Cup and Elite** = Online matches.

## Fixed mode sequence per series length

A series' mode always follows one of these three fixed sequences, keyed by how many
games are actually played (`map_number` position within the series, 1-indexed):

| Map # | Best of 3 | Best of 5 | Best of 7 |
|---|---|---|---|
| 1 | Hardpoint | Hardpoint | Hardpoint |
| 2 | Search and Destroy | Search and Destroy | Search and Destroy |
| 3 | Overload | Overload | Overload |
| 4 | - | Hardpoint | Hardpoint |
| 5 | - | Search and Destroy | Search and Destroy |
| 6 | - | - | Overload |
| 7 | - | - | Search and Destroy |

A series that ends early (e.g. a 3-0 sweep of a Bo5) simply has fewer `match_maps` rows -
the sequence isn't padded out with unplayed games.

## Best-of size by round

- **Cup Online**: hybrid bracket - single elimination down to top 8, then double
  elimination. Standard match = Best of 5 (first to 3). The Finals Match (winners-final
  winner vs elimination-final winner) = Best of 7 (first to 4).
- **Elite Online**: same single/double-elimination Best-of-5 structure as Cups (games
  aren't itemized separately in the ruleset the user quoted, but the fixed mode sequence
  table above still applies the same way).
- **LAN (Major/Open)**: double elimination. Best of 3 (first to 2) up through Top 16,
  Best of 5 (first to 3) from Top 32 onward. The LAN Finals Match = Best of 7 (first to 4).

## Map pool per mode

Only these maps are valid for a given mode - useful as a validation whitelist against
`match_maps.map_name`:

- **Hardpoint**: Colossus, Den, Gridlock, Hacienda, Sake, Scar
- **Search and Destroy**: Den, Fringe, Gridlock, Hacienda, Raid, Sake
- **Overload**: Den, Exposure, Gridlock, Scar
