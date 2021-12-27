import { useContext } from "react"
import { AuthContext } from "../contexts/AuthContexts"
import { validateUserPermissions } from "../utils/validateUserPermissions"

type useCanParams = {
    permissions?: string[],
    roles?: string[],
}

export function useCan({ permissions, roles }: useCanParams) {
    const { user, isAuthenticated } = useContext(AuthContext)

    if (!isAuthenticated) {
        return false
    }

    const userHasValidPermissions = validateUserPermissions({
        user,
        permissions,
        roles
    })

    return userHasValidPermissions

}