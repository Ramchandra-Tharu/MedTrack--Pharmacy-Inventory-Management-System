export interface IMedicine {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBatch {
  _id: string;
  medicineId: string;
  quantity: number;
  expirationDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISale {
  _id: string;
  medicineId: string;
  quantity: number;
  date: Date;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}
