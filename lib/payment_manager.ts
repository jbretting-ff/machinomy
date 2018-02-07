import * as BigNumber from 'bignumber.js'
import ChainManager from './chain_manager'
import { PaymentChannel } from './payment_channel'
import Payment from './payment'
import ChannelContract from './channel_contract'

export default class PaymentManager {
  private chainManager: ChainManager

  private channelContract: ChannelContract

  constructor (chainManager: ChainManager, channelContract: ChannelContract) {
    this.chainManager = chainManager
    this.channelContract = channelContract
  }

  async buildPaymentForChannel (channel: PaymentChannel, value: BigNumber.BigNumber, price: BigNumber.BigNumber, meta: string): Promise<Payment> {
    const totalValue = channel.spent.plus(value)
    const digest = await this.channelContract.paymentDigest(channel.channelId, totalValue)
    const signature = await this.chainManager.sign(channel.sender, digest)

    return new Payment({
      channelId: channel.channelId,
      sender: channel.sender,
      receiver: channel.receiver,
      price,
      value: totalValue,
      channelValue: channel.value,
      signature,
      meta,
      contractAddress: channel.contractAddress,
      token: undefined
    })
  }

  async isValid (payment: Payment, paymentChannel: PaymentChannel): Promise<boolean> {
    const validIncrement = (paymentChannel.spent.plus(payment.price)).lessThanOrEqualTo(paymentChannel.value)
    const validChannelValue = paymentChannel.value.equals(payment.channelValue)
    const validChannelId = paymentChannel.channelId === payment.channelId
    const validPaymentValue = paymentChannel.value.lessThanOrEqualTo(payment.channelValue)
    const validSender = paymentChannel.sender === payment.sender
    const isPositive = payment.value.greaterThanOrEqualTo(new BigNumber.BigNumber(0)) && payment.price.greaterThanOrEqualTo(new BigNumber.BigNumber(0))
    const digest = await this.channelContract.paymentDigest(paymentChannel.channelId, payment.value)
    const signature = await this.chainManager.sign(paymentChannel.sender, digest)
    const validSignature = payment.signature.isEqual(signature)

    return validIncrement &&
      validChannelValue &&
      validPaymentValue &&
      validSender &&
      validChannelId &&
      validSignature &&
      isPositive
  }
}
