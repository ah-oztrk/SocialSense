from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import os
from datetime import datetime

from app.core.auth import SECRET_KEY, ALGORITHM


class JWTBearer(HTTPBearer):
    def __init__(self, auto_error: bool = True):
        super(JWTBearer, self).__init__(auto_error=auto_error)

    async def __call__(self, request: Request):
        credentials: HTTPAuthorizationCredentials = await super(JWTBearer, self).__call__(request)

        if credentials:
            if not credentials.scheme == "Bearer":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Invalid authentication scheme."
                )
            if not self.verify_jwt(credentials.credentials):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Invalid token or expired token."
                )
            return credentials.credentials
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid authorization code."
            )

    def verify_jwt(self, jwt_token: str) -> bool:
        """Verify a JWT token"""
        is_token_valid = False

        try:
            payload = jwt.decode(
                jwt_token,
                SECRET_KEY,
                algorithms=[ALGORITHM]
            )

            # Check if token is expired
            if 'exp' in payload:
                expiration = datetime.fromtimestamp(payload['exp'])
                if expiration < datetime.utcnow():
                    return False

            is_token_valid = True
        except JWTError:
            is_token_valid = False

        return is_token_valid


def validate_token(token: str):
    """Validate token and return payload if valid"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None