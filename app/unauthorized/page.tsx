export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="panel-surface w-full max-w-md rounded-3xl p-8">
        <h1 className="mb-4 text-2xl font-semibold text-red-600">Access Denied</h1>
        <p className="mb-6 text-gray-700">
          Your email address is not authorized to access this application.
        </p>
        <p className="text-sm text-gray-600">
          If you believe this is an error, please contact the administrator.
        </p>
      </div>
    </div>
  );
}
