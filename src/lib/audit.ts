import prisma from "./prisma";

interface CreateAuditLogParams {
  userId?: string;
  userName?: string;
  userRole?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
}

/**
 * Creates an audit log entry in the database.
 * Pass a Prisma transaction client (tx) for transactional consistency,
 * or leave undefined to use the global prisma client.
 */
export async function createAuditLog(
  params: CreateAuditLogParams,
  tx?: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
): Promise<void> {
  const client = tx ?? prisma;
  try {
    await (client as typeof prisma).auditLog.create({
      data: {
        userId: params.userId,
        userName: params.userName,
        userRole: params.userRole,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        oldValue: params.oldValue,
        newValue: params.newValue,
        ipAddress: params.ipAddress,
      },
    });
  } catch (error) {
    // Audit log failure should never break the main operation
    console.error("Failed to create audit log:", error);
  }
}
