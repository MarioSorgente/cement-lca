// pages/_app.tsx
import type { AppProps } from 'next/app'
import Head from 'next/head'
import '../styles/globals.css'

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Cement LCA Comparison Tool</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Compare embodied carbon (A1–A3 & A4) of cement options and see reductions vs an OPC baseline."
        />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
