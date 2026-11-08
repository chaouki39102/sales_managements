// resources/js/pages/users/UsersPage.tsx
// ════════════════════════════════════════════════
// إدارة المستخدمين + الأدوار + الصلاحيات — واجهة متكاملة
// ════════════════════════════════════════════════
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "@/components/ui";
import type { Role, User } from "./types";
import { useUsersPageData } from "./hooks/useUsersPageData";
import UserDetailModal from "./components/UserDetailModal";
import UserFormModal from "./components/UserFormModal";
import RoleFormModal from "./components/RoleFormModal";
import RoleDetailModal from "./components/RoleDetailModal";
import UsersPageHeader from "./components/UsersPageHeader";
import UsersMainTabs from "./components/UsersMainTabs";
import UsersTab from "./components/UsersTab";
import RolesTab from "./components/RolesTab";
import PermissionsTab from "./components/PermissionsTab";

export default function UsersPage() {
    const { activeCompany } = useAuth() as any;
    const slug = activeCompany?.slug as string | undefined;

    const [mainTab, setMainTab] = useState<"users" | "roles" | "permissions">(
        "users",
    );
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

    // User modals
    const [viewUser, setViewUser] = useState<User | null>(null);
    const [editUser, setEditUser] = useState<User | null>(null);
    const [showAdd, setShowAdd] = useState(false);

    // Role modals
    const [viewRole, setViewRole] = useState<Role | null>(null);
    const [editRole, setEditRole] = useState<Role | null>(null);
    const [showAddRole, setShowAddRole] = useState(false);

    const deleteConfirm = useConfirm();

    const {
        users,
        usersLoading,
        roles,
        rolesLoading,
        permissions,
        permsLoading,
        deleteUser,
        assignRole,
    } = useUsersPageData(search);

    if (!slug)
        return (
            <div className="page on">
                <div className="empty">
                    <div className="empty-tx">تحميل...</div>
                </div>
            </div>
        );

    return (
        <>


            <div
                className="page on"
                id="p-users"
                style={{ animation: "slideIn .25s ease" }}
            >
                {/* ── Header ── */}
                <UsersPageHeader
                    users={users}
                    roles={roles}
                    permissions={permissions}
                    mainTab={mainTab}
                    setShowAdd={setShowAdd}
                    setShowAddRole={setShowAddRole}
                />

                {/* ── Main Tabs ── */}
                <UsersMainTabs
                    mainTab={mainTab}
                    setMainTab={setMainTab}
                    users={users}
                    roles={roles}
                    permissions={permissions}
                />

                {/* ══════════ USERS TAB ══════════ */}
                {mainTab === "users" && (
                    <UsersTab
                        search={search}
                        setSearch={setSearch}
                        filter={filter}
                        setFilter={setFilter}
                        users={users}
                        usersLoading={usersLoading}
                        roles={roles}
                        assignRole={assignRole}
                        deleteUser={deleteUser}
                        deleteConfirm={deleteConfirm}
                        setViewUser={setViewUser}
                        setEditUser={setEditUser}
                    />
                )}

                {/* ══════════ ROLES TAB ══════════ */}
                {mainTab === "roles" && (
                    <RolesTab
                        roles={roles}
                        rolesLoading={rolesLoading}
                        setViewRole={setViewRole}
                        setEditRole={setEditRole}
                    />
                )}

                {/* ══════════ PERMISSIONS TAB ══════════ */}
                {mainTab === "permissions" && (
                    <PermissionsTab
                        permissions={permissions}
                        permsLoading={permsLoading}
                    />
                )}
            </div>

            {/* ── Modals ── */}
            {viewUser && (
                <UserDetailModal
                    user={viewUser}
                    onClose={() => setViewUser(null)}
                    onEdit={(u) => {
                        setViewUser(null);
                        setEditUser(u);
                    }}
                />
            )}
            {(showAdd || editUser) && (
                <UserFormModal
                    user={editUser}
                    roles={roles}
                    permissions={permissions}
                    onClose={() => {
                        setShowAdd(false);
                        setEditUser(null);
                    }}
                />
            )}
            {viewRole && (
                <RoleDetailModal
                    role={viewRole}
                    onClose={() => setViewRole(null)}
                    onEdit={(r) => {
                        setViewRole(null);
                        setEditRole(r);
                    }}
                />
            )}
            {(showAddRole || editRole) && (
                <RoleFormModal
                    role={editRole}
                    permissions={permissions}
                    onClose={() => {
                        setShowAddRole(false);
                        setEditRole(null);
                    }}
                />
            )}
            <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
        </>
    );
}
