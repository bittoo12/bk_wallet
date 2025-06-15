import mongoose from 'mongoose';

const WalletOwnerSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // associated to ADMIN
  walletAddressEth: { type: String, required: true },
  privateKeyEth: { type: String, required: true },
  walletAddressTron: { type: String, required: true },
  privateKeyTron: { type: String, required: true },
  mnemonic: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const WalletOwner = mongoose.model('WalletOwner', WalletOwnerSchema);

export default WalletOwner;
