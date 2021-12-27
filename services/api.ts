import axios, { AxiosError } from "axios";
import { parseCookies, setCookie } from 'nookies'
import { signOut } from "../contexts/AuthContexts";
import { AuthTokenError } from "./errors/AuthTokenError";

let isRefreshing = false
let failedRequestsQueue = []

export function setupApiClient(ctx = undefined) {
    let cookies = parseCookies(ctx)
    
    const api = axios.create({
        baseURL: 'http://localhost:3333',
        headers: {
            Authorization: `Bearer ${cookies['nextauth.token']}`
        }
    })

    api.interceptors.response.use(response => {
        return response
    }, (error: AxiosError) => {
        if (error.response.status === 401) {
            if (error.response.data?.code === 'token.expired') {
                cookies = parseCookies(ctx)

                const { 'nextauth.refreshToken': refreshToken } = cookies
                const originalconfig = error.config


                if (!isRefreshing) {
                    isRefreshing = true

                    api.post('/refresh', {
                        refreshToken,
                    }).then(response => {
                        const { token } = response.data

                        setCookie(ctx, 'nextauth.token', token, {
                            maxAge: 60 * 60 * 24 * 30,
                            path: '/'
                        })
                        setCookie(ctx, 'nextauth.refreshToken', response.data.refreshToken, {
                            maxAge: 60 * 60 * 24 * 30,
                            path: '/'
                        })

                        api.defaults.headers['Authorization'] = `Bearer ${token}`

                        failedRequestsQueue.forEach(req => req.onSuccess(token))
                        failedRequestsQueue = []
                    }).catch(err => {
                        failedRequestsQueue.forEach(req => req.onFailure(err))
                        failedRequestsQueue = []

                        if (process.browser) {
                            signOut()
                        }

                    }).finally(() => {
                        isRefreshing = false


                    })
                }

                return new Promise((resolve, reject) => {
                    failedRequestsQueue.push({
                        onSuccess: (token: string) => {
                            originalconfig.headers['Authorization'] = `Bearer ${token}`

                            resolve(api(originalconfig))
                        },
                        onFailure: (error: AxiosError) => {
                            reject(error)
                        },
                    })
                })
            } else {
                if (process.browser) {
                    signOut()
                } else {
                    return Promise.reject(new AuthTokenError())
                }
            }
        }

        return Promise.reject(error)
    })

    return api
}