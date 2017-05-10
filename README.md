# Airbitz Core Shitcoin TxLib 

Implement shitcoin transactions against the [airbitz-shitcoin-server](https://github.com/Airbitz/airbitz-shitcoin-server).
The API can be found [here](https://developer.airbitz.co/javascript/#abctxengine)

Add to your package.json like:
```
"airbitz-txlib-shitcoin": "https://github.com/Airbitz/airbitz-txlib-shitcoin.git",
```

Be aware that you may need to change the "/dist" in the "main" and "module" properties of the package.json to "/src"
import like:

```
import { TxLibBTC } from 'airbitz-txlib-shitcoin'
```
