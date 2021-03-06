import { AppProps } from 'next/app'
import {
  getChainOptions,
  StaticWalletProvider,
  WalletControllerChainOptions,
  WalletProvider
} from '@terra-money/wallet-provider'

import '../styles/globals.css'

const MyApp = ({
  Component,
  pageProps,
  defaultNetwork,
  walletConnectChainIds
}: AppProps & WalletControllerChainOptions) => {
  return typeof window !== 'undefined' ? (
    <WalletProvider defaultNetwork={defaultNetwork} walletConnectChainIds={walletConnectChainIds}>
      <Component {...pageProps} />
    </WalletProvider>
  ) : (
    <StaticWalletProvider defaultNetwork={defaultNetwork}>
      <Component {...pageProps} />
    </StaticWalletProvider>
  )
}

MyApp.getInitialProps = async () => {
  const chainOptions = await getChainOptions()
  return {
    ...chainOptions
  }
}

export default MyApp
