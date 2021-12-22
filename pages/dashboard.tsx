import { useContext, useEffect } from "react"
import { AuthContext } from "../contexts/AuthContexts"
import { api } from "../services/api"

export default function DashBoard() {

    const { user } = useContext(AuthContext)

    useEffect(() => {
         api.get('/me').then(resp => console.log(resp))   
         .catch(err => console.log(err))
    }, [])
    return (
        <h1>Dashboard {user?.email}</h1>
    )
}