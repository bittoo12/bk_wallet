import mongoose from 'mongoose';

const WalletAddressSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'WalletOwner' },
  userId: { type: String, required: true },
  ethAddress: { type: String, required: false },
  tronAddress : {type: String, required: false },
  privateKeyEth: { type: String, required: false },
  privateKeyTron :{type: String, required: false},
  derivationPath: { type: String, required: true },
  index: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  qrCodeBaseTron: { type: String, required: true },
  qrCodeBaseEth: { type: String, required: true },
});

const WalletAddress = mongoose.model('WalletAddress', WalletAddressSchema);

export default WalletAddress;
