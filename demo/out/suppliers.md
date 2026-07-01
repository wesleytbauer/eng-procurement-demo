# Supplier identity

| incoming reference | resolved identity |
| --- | --- |
| Acme Steel Inc / 11-1111111 (ariba) | tax:111111111 |
| ACME STEEL / 111111111 (email) | tax:111111111 |
| Acme Steel Incorporated (manual) | tax:111111111 |
| Globex Plastics LLC / 22-2222222 | tax:222222222 |
| Globex Plastics / 222222222 (edi) | tax:222222222 |
| Initech Controls Co / 33-3333333 | tax:333333333 |
| Umbrella Encoders GmbH / 44-4444444 | tax:444444444 |
| Stark Harnessing Ltd / 55-5555555 | tax:555555555 |
| Wayne Fasteners Corp / 66-6666666 | tax:666666666 |
| Wonka Encoder Works / 77-7777777 | tax:777777777 |
| Soylent Drives LLC / 88-8888888 | tax:888888888 |
| Tyrell Gearworks / 99-9999999 | tax:999999999 |
| Cyberdyne Internal MRO / 10-1010101 | tax:101010101 |
| Hooli Housings Inc / 12-1212121 | tax:121212121 |
| Vandelay Wiring / 13-1313131 | tax:131313131 |

Local master vs external system-of-record induce the **same partition** over these references: **✓ identical** — the consumer contract is store-agnostic (SUP-R-01/-R-05).
