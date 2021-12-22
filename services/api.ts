import axios, { AxiosError } from "axios";
import { parseCookies, setCookie } from 'nookies'
import { signOut } from "../contexts/AuthContexts";

let cookies = parseCookies()
let isRefreshing = false
let failedRequestsQueue = []

export const api = axios.create({
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
            cookies = parseCookies()

            const { 'nextauth.refreshToken': refreshToken } = cookies
            const originalconfig = error.config


            if (!isRefreshing) {
                isRefreshing = true

                api.post('/refresh', {
                    refreshToken,
                }).then(response => {
                    const { token } = response.data

                    setCookie(undefined, 'nextauth.token', token, {
                        maxAge: 60 * 60 * 24 * 30,
                        path: '/'
                    })
                    setCookie(undefined, 'nextauth.refreshToken', response.data.refreshToken, {
                        maxAge: 60 * 60 * 24 * 30,
                        path: '/'
                    })

                    api.defaults.headers['Authorization'] = `Bearer ${token}`

                    failedRequestsQueue.forEach(req => req.onSuccess(token))
                    failedRequestsQueue = []
                }).catch(err => {
                    failedRequestsQueue.forEach(req => req.onFailure(err))
                    failedRequestsQueue = []
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
            signOut()
        }
    }

    return Promise.reject(error)
})