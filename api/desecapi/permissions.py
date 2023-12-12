from ipaddress import IPv4Address, IPv4Network

from rest_framework import permissions

from desecapi.models import RRset


class IsActiveUser(permissions.BasePermission):
    """
    Allows access only to activated users.
    """

    def has_permission(self, request, view):
        # Authenticated users can have is_active = None (pending activation). Those are not considered active.
        return request.user and request.user.is_active


class IsAPIToken(permissions.BasePermission):
    """
    Allows access only with API token (.mfa is None).
    """

    message = "API token required."
    code = "api_token_required"

    def has_permission(self, request, view):
        return request.auth.mfa is None


class IsLoginToken(permissions.BasePermission):
    """
    Allows access only with login token (.mfa is not None).

    DRF permission negation is flawed, so ~IsAPIToken does not give the correct behavior:
    https://github.com/encode/django-rest-framework/issues/6598#issuecomment-484824743
    """

    message = "Login token required."
    code = "login_token_required"

    def has_permission(self, request, view):
        return request.auth.mfa is not None


class MFARequiredIfEnabled(permissions.BasePermission):
    """
    Allows access only to when
        - the token is a human token that has passed MFA, or
        - the token is a human token that has not passed MFA, but the user has not enabled MFA at all.
    """

    message = "Multi-factor authentication required."
    code = "mfa_required"

    def has_permission(self, request, view):
        return request.auth.mfa or (
            request.auth.mfa is False and not request.user.mfa_enabled
        )


class IsOwner(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to view or edit it.
    """

    def has_object_permission(self, request, view, obj):
        return obj.owner == request.user


class IsDomainOwner(permissions.BasePermission):
    """
    Custom permission to only allow owners of a domain to view or edit an object owned by that domain.
    """

    def has_permission(self, request, view):
        return request.user == view.domain.owner


class TokenNoDomainPolicy(permissions.BasePermission):
    """
    Permission to check whether a token is unrestricted by any policy.
    """

    def has_permission(self, request, view):
        return not request.auth.tokendomainpolicy_set.exists()


class TokenHasRRsetPermission(permissions.BasePermission):
    """
    Permission to check whether a token authorizes writing the view's RRset.
    """

    code = "forbidden"
    message = "Insufficient token permissions."

    def has_object_permission(self, request, view, obj):
        policy = request.auth.get_policy(obj)

        # Pass if there's no policy, otherwise return the permission
        return (policy is None) or policy.perm_write


class AuthTokenCorrespondsToViewToken(permissions.BasePermission):
    """
    Permission to check whether the view kwargs's token_id corresponds to the current token.
    """

    def has_permission(self, request, view):
        return view.kwargs["token_id"] == request.auth.pk


class IsVPNClient(permissions.BasePermission):
    """
    Permission that requires that the user is accessing using an IP from the VPN net.
    """

    message = "Inadmissible client IP."

    def has_permission(self, request, view):
        ip = IPv4Address(request.META.get("REMOTE_ADDR"))
        return ip in IPv4Network("10.8.0.0/24")


class HasManageTokensPermission(permissions.BasePermission):
    """
    Permission to check whether a token has "manage tokens" permission.
    """

    def has_permission(self, request, view):
        return request.auth.perm_manage_tokens


class WithinDomainLimit(permissions.BasePermission):
    """
    Permission that requires that the user still has domain limit quota available.
    """

    message = (
        "Domain limit exceeded. Please contact support to create additional domains."
    )

    def has_permission(self, request, view):
        return (
            request.user.limit_domains is None
            or request.user.domains.count() < request.user.limit_domains
        )
