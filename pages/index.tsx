import React, { useEffect, useMemo, useState, useCallback } from 'react'
import type { NextPage } from 'next'
import {
  LCDClient,
  MsgSend,
  StdFee,
  StdSignature,
  StdSignMsg,
  StdTx,
  SyncTxBroadcastResult
} from '@terra-money/terra.js'
import {
  useWallet,
  WalletStatus,
  useConnectedWallet,
  CreateTxFailed,
  Timeout,
  TxFailed,
  TxResult,
  TxUnspecifiedError,
  UserDenied,
  SignResult
} from '@terra-money/wallet-provider'

const toAddress = 'terra12hnhh5vtyg5juqnzm43970nh4fw42pt27nw9g9'

const ConnectSample = () => {
  const {
    status,
    network,
    wallets,
    availableConnectTypes,
    availableInstallTypes,
    connect,
    install,
    disconnect
  } = useWallet()

  const isConnected = status === WalletStatus.WALLET_CONNECTED
  const isNotConnect = status === WalletStatus.WALLET_NOT_CONNECTED

  return (
    <>
      <h2>Wallet Info</h2>
      <pre>
        {JSON.stringify(
          {
            status,
            network,
            wallets,
            availableConnectTypes,
            availableInstallTypes
          },
          null,
          2
        )}
      </pre>

      {isNotConnect && (
        <div style={{ gridGap: '8px', display: 'flex' }}>
          {availableInstallTypes.map((connectType) => (
            <button key={'install-' + connectType} onClick={() => install(connectType)}>
              Install {connectType}
            </button>
          ))}
          {availableConnectTypes.map((connectType) => (
            <button key={'connect-' + connectType} onClick={() => connect(connectType)}>
              Connect {connectType}
            </button>
          ))}
        </div>
      )}
      {isConnected && <button onClick={() => disconnect()}>Disconnect</button>}
    </>
  )
}

const SampleQuery = () => {
  const connectedWallet = useConnectedWallet()

  const [bank, setBank] = useState<null | string>()

  const lcd = useMemo(() => {
    if (!connectedWallet) {
      return null
    }

    return new LCDClient({
      URL: connectedWallet.network.lcd,
      chainID: connectedWallet.network.chainID
    })
  }, [connectedWallet])

  useEffect(() => {
    if (connectedWallet && lcd) {
      lcd.bank.balance(connectedWallet.walletAddress).then((coins) => {
        setBank(coins.toString())
      })
    } else {
      setBank(null)
    }
  }, [connectedWallet, lcd])

  return (
    <>
      <h2>Query Sample</h2>
      {bank && <pre>{bank}</pre>}
      {!connectedWallet && <p>Wallet not connected!</p>}
    </>
  )
}

const TxSample = () => {
  const [txResult, setTxResult] = useState<TxResult | null>(null)
  const [txError, setTxError] = useState<string | null>(null)

  const connectedWallet = useConnectedWallet()

  const send = useCallback(() => {
    if (!connectedWallet) {
      return
    }

    if (connectedWallet.network.chainID.startsWith('columbus')) {
      alert(`Please only execute this example on Testnet`)
      return
    }

    setTxResult(null)

    connectedWallet
      .post({
        fee: new StdFee(1000000, '200000uusd'),
        msgs: [
          new MsgSend(connectedWallet.walletAddress, toAddress, {
            uusd: 1000000
          })
        ]
      })
      .then((nextTxResult: TxResult) => {
        console.log(nextTxResult)
        setTxResult(nextTxResult)
      })
      .catch((error: unknown) => {
        if (error instanceof UserDenied) {
          setTxError('User Denied')
        } else if (error instanceof CreateTxFailed) {
          setTxError('Create Tx Failed: ' + error.message)
        } else if (error instanceof TxFailed) {
          setTxError('Tx Failed: ' + error.message)
        } else if (error instanceof Timeout) {
          setTxError('Timeout')
        } else if (error instanceof TxUnspecifiedError) {
          setTxError('Unspecified Error: ' + error.message)
        } else {
          setTxError('Unknown Error: ' + (error instanceof Error ? error.message : String(error)))
        }
      })
  }, [connectedWallet])

  return (
    <div>
      <h2>Tx Sample</h2>
      {connectedWallet?.availablePost && !txResult && !txError && (
        <button onClick={send}>Send 1USD to {toAddress}</button>
      )}
      {txResult && (
        <>
          <pre>{JSON.stringify(txResult, null, 2)}</pre>
          <button onClick={() => setTxResult(null)}>Clear Tx Result</button>
        </>
      )}
      {txError && (
        <>
          <pre>{txError}</pre>
          <button onClick={() => setTxError(null)}>Clear Tx Error</button>
        </>
      )}
      {!connectedWallet && <p>Wallet not connected!</p>}
      {connectedWallet && !connectedWallet.availablePost && <p>Can not post Tx</p>}
    </div>
  )
}

const SignSample = () => {
  const [signResult, setSignResult] = useState<SignResult | null>(null)
  const [txResult, setTxResult] = useState<SyncTxBroadcastResult | null>(null)
  const [txError, setTxError] = useState<string | null>(null)

  const connectedWallet = useConnectedWallet()

  const send = useCallback(() => {
    if (!connectedWallet) {
      return
    }

    if (connectedWallet.network.chainID.startsWith('columbus')) {
      alert(`Please only execute this example on Testnet`)
      return
    }

    setSignResult(null)

    connectedWallet
      .sign({
        fee: new StdFee(1000000, '200000uusd'),
        msgs: [
          new MsgSend(connectedWallet.walletAddress, toAddress, {
            uusd: 1000000
          })
        ]
      })
      .then((nextSignResult: SignResult) => {
        setSignResult(nextSignResult)

        // broadcast
        const { signature, public_key, stdSignMsgData } = nextSignResult.result

        const sig = StdSignature.fromData({
          signature,
          pub_key: public_key
        })

        const stdSignMsg = StdSignMsg.fromData(stdSignMsgData)

        const lcd = new LCDClient({
          chainID: connectedWallet.network.chainID,
          URL: connectedWallet.network.lcd
        })

        return lcd.tx.broadcastSync(
          new StdTx(stdSignMsg.msgs, stdSignMsg.fee, [sig], stdSignMsg.memo)
        )
      })
      .then((nextTxResult: SyncTxBroadcastResult) => {
        setTxResult(nextTxResult)
      })
      .catch((error: unknown) => {
        if (error instanceof UserDenied) {
          setTxError('User Denied')
        } else if (error instanceof CreateTxFailed) {
          setTxError('Create Tx Failed: ' + error.message)
        } else if (error instanceof TxFailed) {
          setTxError('Tx Failed: ' + error.message)
        } else if (error instanceof Timeout) {
          setTxError('Timeout')
        } else if (error instanceof TxUnspecifiedError) {
          setTxError('Unspecified Error: ' + error.message)
        } else {
          setTxError('Unknown Error: ' + (error instanceof Error ? error.message : String(error)))
        }
      })
  }, [connectedWallet])

  return (
    <div>
      <h1>Sign Sample</h1>
      {connectedWallet?.availableSign && !signResult && !txError && (
        <button onClick={() => send()}>Send 1USD to {toAddress}</button>
      )}
      {signResult && (
        <>
          <pre>{JSON.stringify(signResult, null, 2)}</pre>
          {txResult && <pre>{JSON.stringify(txResult, null, 2)}</pre>}
          {connectedWallet && txResult && (
            <a
              href={`https://finder.terra.money/${connectedWallet.network.chainID}/tx/${txResult.txhash}`}
              target='_blank'
              rel='noreferrer'
            >
              Open Tx Result in Terra Finder
            </a>
          )}
          <button onClick={() => setSignResult(null)}>Clear Result</button>
        </>
      )}
      {txError && (
        <>
          <pre>{txError}</pre>
          <button onClick={() => setTxError(null)}>Clear Error</button>
        </>
      )}
      {!connectedWallet && <p>Wallet not connected!</p>}
      {connectedWallet && !connectedWallet.availableSign && <p>Can not sign Tx</p>}
    </div>
  )
}

const Home: NextPage = () => {
  return (
    <div>
      <ConnectSample />
      <SampleQuery />
      <TxSample />
      <SignSample />
    </div>
  )
}

export default Home
