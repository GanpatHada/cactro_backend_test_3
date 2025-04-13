class ApiResponse{
    constructor(statusCode,data,message)
    {
        this.statusCode=statusCode;
        this.message=message;
        this.success=statusCode<300;
        this.data=data;
    }
}
module.exports= ApiResponse;