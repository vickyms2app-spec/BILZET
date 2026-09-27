export class ApiResponse {
  constructor(statusCode, data = {}, message = 'Success', meta = undefined) {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
    if (meta !== undefined) {
      this.meta = meta;
    }
  }

  send(res) {
    const payload = {
      success: this.success,
      message: this.message,
      data: this.data
    };
    if (this.meta !== undefined) {
      payload.meta = this.meta;
    }
    return res.status(this.statusCode).json(payload);
  }
}

export const sendResponse = (res, statusCode, data, message, meta) => {
  return new ApiResponse(statusCode, data, message, meta).send(res);
};

export default ApiResponse;
