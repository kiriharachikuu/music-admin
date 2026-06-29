import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { getToken, clearAuth } from "./auth";

// XingTone管理后台 axios 实例
// baseURL 由环境变量 NEXT_PUBLIC_API_BASE 配置，默认指向本地后端
// 不预设默认 Content-Type：让 axios 按数据类型自动设置
// - 普通对象 → application/json
// - FormData → multipart/form-data（浏览器自动加 boundary）
// 预设 application/json 会导致 FormData 请求 Content-Type 不被覆盖，后端 multer 解析失败
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000/api",
  timeout: 15000,
});

// 后端统一响应格式：{ code, data, message }
export interface ApiResult<T = unknown> {
  code: number;
  data: T;
  message: string;
}

// 请求拦截器：自动携带 JWT
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器：解包 { code, data, message }，统一错误处理
api.interceptors.response.use(
  (response) => {
    const result = response.data as ApiResult;
    // 仅处理后端标准格式 { code, data, message }
    if (result && typeof result === "object" && "code" in result) {
      // 后端 code 为 HTTP 状态码，2xx 视为成功，直接返回 data
      if (result.code >= 200 && result.code < 300) {
        // 拦截器解包后，调用方拿到的即为业务数据 data
        return result.data as unknown as typeof response;
      }
      // 业务错误：抛出 message
      return Promise.reject(new Error(result.message || "请求失败"));
    }
    // 非标准格式（如文件流）直接返回原始数据
    return response.data as unknown as typeof response;
  },
  (error: AxiosError<{ message?: string; code?: number }>) => {
    const status = error.response?.status;
    // 401 未授权：清除登录态并跳转登录页
    if (status === 401) {
      clearAuth();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return Promise.reject(new Error("未登录或登录已过期"));
    }
    const msg =
      error.response?.data?.message || error.message || "网络错误，请稍后重试";
    return Promise.reject(new Error(msg));
  }
);

/**
 * 通用请求方法，泛型 T 为业务数据 data 的类型
 * 用法：const data = await request<User>('/user/info', { method: 'GET' })
 */
export function request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
  // 第一个泛型保留为 unknown，第二个泛型 T 为实际返回类型（与拦截器解包一致）
  return api.request<unknown, T>(config);
}

export default api;
