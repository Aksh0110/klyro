import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CounterDocument = Counter & Document;

@Schema({ collection: 'counters' })
export class Counter {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ required: true, index: true })
  name!: string;

  @Prop({ required: true, default: 1000 })
  seq!: number;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);
CounterSchema.index({ organizationId: 1, name: 1 }, { unique: true });
