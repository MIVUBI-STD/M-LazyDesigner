# Gateway Surface Contract

Owns the stable client-surface profile contract.

```text
stable_four
hybrid_4_experimental
```

This folder may define which Gateway surface profile was selected, but it does not implement experimental tools.

Stable Gateway source may depend on this contract. Experimental implementation lives under `../experimental/` and is loaded only by the Gateway composition root after explicit profile selection.
