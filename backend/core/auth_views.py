"""
Authentication views for JWT token management with httpOnly cookies.
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import authenticate
from django.conf import settings
from core.serializers import (
    LoginSerializer,
    UserSerializer,
)


class LoginView(APIView):
    """
    POST /api/v1/auth/login/
    Accept email/password, return access token in body
    + refresh token in httpOnly cookie.

    Security:
    - Access token: Returned in JSON (stored in memory by frontend)
    - Refresh token: Set as httpOnly cookie (inaccessible to JavaScript)
    - CSRF token: Auto-set by Django middleware
    """

    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        # Authenticate user
        user = authenticate(request, username=email, password=password)

        if user is None:
            return Response(
                {"error": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {"error": "User account is disabled"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Generate tokens
        refresh = RefreshToken.for_user(user)

        # Prepare response with only access token and user data
        response_data = {
            "access_token": str(refresh.access_token),
            "user": UserSerializer(user).data,
        }

        response = Response(response_data, status=status.HTTP_200_OK)

        # Set refresh token as httpOnly cookie (XSS protection)
        is_production = settings.DEBUG is False
        response.set_cookie(
            key="refresh_token",
            value=str(refresh),
            httponly=True,  # Cannot be accessed by JavaScript (XSS protection)
            secure=is_production,  # HTTPS only in production
            samesite="Lax",  # CSRF protection (allows top-level navigation)
            max_age=7 * 24 * 60 * 60,  # 7 days (matches token lifetime)
            path="/api/v1/auth/",  # Only sent to auth endpoints
        )

        return response


class RefreshTokenView(APIView):
    """
    POST /api/v1/auth/refresh/
    Read refresh token from httpOnly cookie, return new access token.

    Security:
    - Reads refresh_token from httpOnly cookie (not request body)
    - Returns new access_token in JSON
    - Maintains httpOnly cookie security
    """

    permission_classes = [AllowAny]

    def post(self, request):
        # Read refresh token from httpOnly cookie
        refresh_token = request.COOKIES.get("refresh_token")

        if not refresh_token:
            return Response(
                {"error": "Refresh token not found"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            # Validate and refresh the token
            refresh = RefreshToken(refresh_token)
            access_token = str(refresh.access_token)

            return Response(
                {"access_token": access_token},
                status=status.HTTP_200_OK,
            )
        except TokenError:
            return Response(
                {"error": "Invalid or expired refresh token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )


class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/
    Blacklist refresh token from httpOnly cookie and clear the cookie.

    Security:
    - Reads refresh_token from httpOnly cookie
    - Blacklists the token to prevent reuse
    - Clears the httpOnly cookie
    - Requires authentication (valid access token)
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Read refresh token from httpOnly cookie
            refresh_token = request.COOKIES.get("refresh_token")

            if not refresh_token:
                return Response(
                    {"error": "Refresh token not found"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Blacklist the refresh token
            token = RefreshToken(refresh_token)
            token.blacklist()

            # Create response
            response = Response(
                {"message": "Successfully logged out"}, status=status.HTTP_200_OK
            )

            # Clear the httpOnly cookie
            response.delete_cookie(
                key="refresh_token",
                path="/api/v1/auth/",
                samesite="Lax",
            )

            return response

        except TokenError:
            return Response(
                {"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserView(APIView):
    """
    GET /api/v1/auth/me/
    Return current authenticated user details with role and permissions.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
