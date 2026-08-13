import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { USER_STATUS, UserStatusType, RoleType } from '@klyro/config';

export type UserDocument = User & Document;

@Schema({ _id: false })
export class UserRoleAssignment {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId!: Types.ObjectId;

  @Prop({ required: true, type: String })
  role!: RoleType;
}

export const UserRoleAssignmentSchema = SchemaFactory.createForClass(UserRoleAssignment);

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, index: true })
  phone!: string;

  @Prop()
  name?: string;

  @Prop()
  email?: string;

  @Prop({ required: true, enum: Object.values(USER_STATUS), default: USER_STATUS.ACTIVE })
  status!: UserStatusType;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Organization' }], default: [] })
  organizationIds!: Types.ObjectId[];

  @Prop({ type: [UserRoleAssignmentSchema], default: [] })
  roles!: UserRoleAssignment[];

  @Prop()
  lastLoginAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
