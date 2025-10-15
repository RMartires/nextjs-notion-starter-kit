declare module 'lqip-modern' {
  interface LqipResult {
    metadata: {
      originalWidth: number
      originalHeight: number
      width: number
      height: number
    }
    content: string
  }

  function lqip(input: Buffer | string): Promise<LqipResult>
  export = lqip
}
