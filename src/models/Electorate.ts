import mongoose, { Schema, Document } from 'mongoose';
import { Citizen } from '@/types/ideology';

export interface IElectorate extends Document {
    name: string;
    description?: string;
    size: number;
    citizens: Citizen[];
    factions?: {
        clusterIndex: number;
        name: string;
        description: string;
    }[];
    createdAt: Date;
}

const ElectorateSchema: Schema = new Schema({
    name: { type: String, required: true },
    description: { type: String },
    size: { type: Number, required: true },
    citizens: { type: Schema.Types.Mixed, required: true }, // Store the JSON array directly
    factions: { type: Schema.Types.Mixed }, // Store the clusters directly
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Electorate || mongoose.model<IElectorate>('Electorate', ElectorateSchema);
