.
├── dist
│   ├── admin
│   │   ├── admin-bootstrap.service.d.ts
│   │   ├── admin-bootstrap.service.js
│   │   ├── admin-bootstrap.service.js.map
│   │   ├── admin.module.d.ts
│   │   ├── admin.module.js
│   │   └── admin.module.js.map
│   ├── app.module.d.ts
│   ├── auth
│   │   ├── auth.controller.d.ts
│   │   ├── auth.module.d.ts
│   │   ├── auth.service.d.ts
│   │   ├── auth.service.js
│   │   ├── auth.service.js.map
│   │   ├── jwt-payload.interface.d.ts
│   │   ├── jwt-payload.interface.js
│   │   ├── jwt-payload.interface.js.map
│   │   ├── jwt.strategy.d.ts
│   │   ├── jwt.strategy.js
│   │   └── jwt.strategy.js.map
│   ├── common
│   │   ├── financial-crypto.d.ts
│   │   ├── financial-crypto.js
│   │   ├── financial-crypto.js.map
│   │   ├── pino-console.transport.d.ts
│   │   ├── pino-console.transport.js
│   │   └── pino-console.transport.js.map
│   ├── financial-destinations
│   │   ├── dto
│   │   │   ├── create-saved-destination.dto.d.ts
│   │   │   ├── create-saved-destination.dto.js
│   │   │   └── create-saved-destination.dto.js.map
│   │   ├── financial-destinations.controller.d.ts
│   │   ├── financial-destinations.module.d.ts
│   │   └── financial-destinations.service.d.ts
│   ├── goals
│   │   ├── goals.controller.d.ts
│   │   ├── goals.module.d.ts
│   │   ├── goals.service.d.ts
│   │   ├── goals.service.js
│   │   └── goals.service.js.map
│   ├── main.d.ts
│   ├── payments
│   │   ├── payments.module.d.ts
│   │   ├── payments.service.d.ts
│   │   ├── payments.service.js
│   │   └── payments.service.js.map
│   ├── scheduled-payments
│   │   ├── scheduled-payments.controller.d.ts
│   │   ├── scheduled-payments.module.d.ts
│   │   ├── scheduled-payments.module.js
│   │   ├── scheduled-payments.module.js.map
│   │   ├── scheduled-payments.scheduler.d.ts
│   │   ├── scheduled-payments.service.d.ts
│   │   ├── scheduled-payments.service.js
│   │   └── scheduled-payments.service.js.map
│   ├── security
│   │   ├── security.controller.d.ts
│   │   ├── security.module.d.ts
│   │   ├── security.service.d.ts
│   │   ├── security.service.js
│   │   └── security.service.js.map
│   ├── spending-limits
│   │   ├── dto
│   │   │   ├── update-spending-limit.dto.d.ts
│   │   │   ├── update-spending-limit.dto.js
│   │   │   └── update-spending-limit.dto.js.map
│   │   ├── spending-limits.controller.d.ts
│   │   ├── spending-limits.module.d.ts
│   │   ├── spending-limits.service.d.ts
│   │   ├── spending-limits.service.js
│   │   └── spending-limits.service.js.map
│   ├── transactions
│   │   ├── transactions.controller.d.ts
│   │   ├── transactions.module.d.ts
│   │   └── transactions.service.d.ts
│   └── wallets
│       ├── wallets.controller.d.ts
│       └── wallets.module.d.ts
├── Dockerfile
├── eslint.config.mjs
├── logs
│   └── http.1.log
├── nest-cli.json
├── package.json
├── package-lock.json
├── prisma
│   ├── migrations
│   │   ├── 20260814154143_init
│   │   │   └── migration.sql
│   │   ├── 20260817180000_add_payments
│   │   │   └── migration.sql
│   │   ├── 20260902120000_add_transaction_reason
│   │   │   └── migration.sql
│   │   ├── 20260902140000_add_p2p_transfer
│   │   │   └── migration.sql
│   │   ├── 20260902160000_add_scheduled_payments
│   │   │   └── migration.sql
│   │   ├── 20260902180000_add_goals
│   │   │   └── migration.sql
│   │   ├── 20260902200000_add_envelopes
│   │   │   └── migration.sql
│   │   ├── 20260902220000_add_notifications
│   │   │   └── migration.sql
│   │   ├── 20260903000000_add_financial_destinations
│   │   │   └── migration.sql
│   │   ├── 20260903010000_add_spending_limits_and_security
│   │   │   └── migration.sql
│   │   ├── 20260903120000_add_admin_roles_and_audit
│   │   │   └── migration.sql
│   │   └── migration_lock.toml
│   └── schema.prisma
├── prisma.config.ts
├── skills-lock.json
├── src
│   ├── admin
│   │   ├── admin-bootstrap.service.ts
│   │   ├── admin.controller.ts
│   │   ├── admin.module.ts
│   │   ├── admin.service.ts
│   │   └── dto
│   │       └── admin-query.dto.ts
│   ├── app.module.ts
│   ├── auth
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── dto
│   │   │   ├── login.dto.ts
│   │   │   └── register.dto.ts
│   │   ├── jwt.config.ts
│   │   ├── jwt-payload.interface.ts
│   │   └── jwt.strategy.ts
│   ├── common
│   │   ├── admin.guard.ts
│   │   ├── authenticated-user.interface.ts
│   │   ├── current-user.decorator.ts
│   │   ├── financial-crypto.ts
│   │   ├── index.ts
│   │   ├── jwt-auth.guard.ts
│   │   ├── logger.config.ts
│   │   └── pino-console.transport.ts
│   ├── database
│   │   ├── database.module.ts
│   │   └── database.service.ts
│   ├── envelopes
│   │   ├── dto
│   │   │   ├── create-envelope.dto.ts
│   │   │   └── envelope-amount.dto.ts
│   │   ├── envelopes.controller.ts
│   │   ├── envelopes.module.ts
│   │   └── envelopes.service.ts
│   ├── financial-destinations
│   │   ├── dto
│   │   │   ├── create-saved-destination.dto.ts
│   │   │   └── update-saved-destination.dto.ts
│   │   ├── financial-destinations.controller.ts
│   │   ├── financial-destinations.module.ts
│   │   └── financial-destinations.service.ts
│   ├── generated
│   │   └── prisma
│   │       ├── browser.ts
│   │       ├── client.ts
│   │       ├── commonInputTypes.ts
│   │       ├── enums.ts
│   │       ├── internal
│   │       │   ├── class.ts
│   │       │   ├── prismaNamespaceBrowser.ts
│   │       │   └── prismaNamespace.ts
│   │       ├── models
│   │       │   ├── AdminAuditLog.ts
│   │       │   ├── EnvelopeMovement.ts
│   │       │   ├── Envelope.ts
│   │       │   ├── FinancialDestination.ts
│   │       │   ├── GoalContribution.ts
│   │       │   ├── Goal.ts
│   │       │   ├── Notification.ts
│   │       │   ├── Payment.ts
│   │       │   ├── ScheduledPaymentExecution.ts
│   │       │   ├── ScheduledPayment.ts
│   │       │   ├── SecurityEvent.ts
│   │       │   ├── Transaction.ts
│   │       │   ├── UserSession.ts
│   │       │   ├── UserSpendingLimit.ts
│   │       │   ├── User.ts
│   │       │   └── Wallet.ts
│   │       └── models.ts
│   ├── goals
│   │   ├── dto
│   │   │   ├── create-goal.dto.ts
│   │   │   └── goal-amount.dto.ts
│   │   ├── goals.controller.ts
│   │   ├── goals.module.ts
│   │   └── goals.service.ts
│   ├── main.ts
│   ├── notifications
│   │   ├── notifications.controller.ts
│   │   ├── notifications.module.ts
│   │   └── notifications.service.ts
│   ├── payments
│   │   ├── payments.module.ts
│   │   ├── payments.service.ts
│   │   ├── zarinpal.config.ts
│   │   └── zarinpal.service.ts
│   ├── scheduled-payments
│   │   ├── dto
│   │   │   └── create-scheduled-payment.dto.ts
│   │   ├── scheduled-payments.controller.ts
│   │   ├── scheduled-payments.module.ts
│   │   ├── scheduled-payments.scheduler.ts
│   │   └── scheduled-payments.service.ts
│   ├── security
│   │   ├── security.controller.ts
│   │   ├── security.module.ts
│   │   └── security.service.ts
│   ├── spending-limits
│   │   ├── dto
│   │   │   └── update-spending-limit.dto.ts
│   │   ├── spending-limits.controller.ts
│   │   ├── spending-limits.module.ts
│   │   └── spending-limits.service.ts
│   ├── transactions
│   │   ├── dto
│   │   ├── transactions.controller.ts
│   │   ├── transactions.module.ts
│   │   └── transactions.service.ts
│   ├── users
│   │   ├── dto
│   │   │   └── lookup-user.dto.ts
│   │   ├── users.controller.ts
│   │   ├── users.module.ts
│   │   └── users.service.ts
│   └── wallets
│       ├── dto
│       │   ├── deposit.dto.ts
│       │   ├── transfer.dto.ts
│       │   └── withdraw.dto.ts
│       ├── wallets.controller.ts
│       ├── wallets.module.ts
│       └── wallets.service.ts
├── structure.md
├── tests
│   ├── helpers
│   │   ├── app.ts
│   │   └── zarinpal.ts
│   ├── integration
│   │   ├── admin.api.spec.ts
│   │   ├── auth.api.spec.ts
│   │   ├── balance.api.spec.ts
│   │   ├── deposit.api.spec.ts
│   │   ├── envelopes.api.spec.ts
│   │   ├── financial-destinations.api.spec.ts
│   │   ├── financial-flow.api.spec.ts
│   │   ├── goals.api.spec.ts
│   │   ├── notifications.api.spec.ts
│   │   ├── scheduled-payments.api.spec.ts
│   │   ├── spending-limits.api.spec.ts
│   │   ├── transfer.api.spec.ts
│   │   └── withdrawal.api.spec.ts
│   ├── jest.config.json
│   ├── setup.ts
│   ├── tsconfig.json
│   └── units
│       ├── admin-bootstrap.service.spec.ts
│       ├── admin.guard.spec.ts
│       ├── admin.service.spec.ts
│       ├── payments.service.spec.ts
│       └── zarinpal.service.spec.ts
├── tsconfig.build.json
├── tsconfig.build.tsbuildinfo
└── tsconfig.json

63 directories, 210 files
