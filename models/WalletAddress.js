const mongoose = require("mongoose");

const WalletAddressSchema = new mongoose.Schema({
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'WalletOwner' },
    userId: { type: String, required: true },
    address: { type: String, required: true },
    privateKey: { type: String, required: true },
    derivationPath: { type: String, required: true },
    index: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
    qrCodeBase64 : {  type: String, required: true,}
});

module.exports =  mongoose.model("WalletAddress", WalletAddressSchema);
