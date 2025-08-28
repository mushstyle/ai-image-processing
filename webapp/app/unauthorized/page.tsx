export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p className="text-gray-700 mb-6">
          Your email address is not authorized to access this application.
        </p>
        <p className="text-gray-600 text-sm">
          If you believe this is an error, please contact the administrator.
        </p>
      </div>
    </div>
  );
}