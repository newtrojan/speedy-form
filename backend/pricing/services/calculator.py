from decimal import Decimal
from typing import Dict, Any, Optional, List
from core.services.base_service import BaseService
from core.exceptions import PricingCalculationError, VehicleNotFoundException
from pricing.models import PricingConfig, ShopPricingRule, InsuranceProvider
from shops.models import Shop
from vehicles.services.vehicle_service import VehicleService


class PricingCalculator(BaseService):
    """
    Service to calculate the price of a quote.
    """

    def __init__(self):
        super().__init__()
        self.vehicle_service = VehicleService()

    def calculate_quote(
        self,
        vin: str,
        glass_type: str,
        shop_id: int,
        service_type: str,
        distance_miles: Optional[float] = None,
        payment_type: str = "cash",
        insurance_provider_id: Optional[int] = None,
        manufacturer: str = "nags",  # Default to NAGS
        use_mock: bool = True,
    ) -> Dict[str, Any]:
        """
        Calculates the full quote breakdown.
        """
        self.log_info(f"Calculating quote for VIN {vin} at Shop {shop_id}")

        # 1. Fetch Vehicle Data
        try:
            vehicle_data = self.vehicle_service.identify_by_vin(vin, use_mock=use_mock)
        except VehicleNotFoundException as e:
            self.log_error(f"Vehicle not found for pricing: {vin}")
            raise e

        # 2. Find the specific glass part
        glass_parts = vehicle_data.get("glass_parts", [])
        # In our mock data, glass_parts is a list of dicts.
        # We need to find the one matching the requested glass_type.
        # For MVP mock data structure, let's assume it looks like:
        # [{"type": "windshield", "nags_id": "...",
        #   "nags_price": 450.00, "pgw_price": ...}]

        selected_part = None
        for part in glass_parts:
            if part.get("type", "").upper() == glass_type.upper():
                selected_part = part
                break

        if not selected_part:
            raise PricingCalculationError(
                f"Glass type '{glass_type}' not found for this vehicle."
            )

        # Extract list price based on manufacturer preference
        # Mock data keys might be "nags_price" or "pgw_price"
        price_key = f"{manufacturer.lower()}_price"
        list_price = Decimal(str(selected_part.get(price_key, 0)))

        if list_price <= 0:
            # Fallback to NAGS if specific manufacturer not found
            list_price = Decimal(str(selected_part.get("nags_price", 0)))

        if list_price <= 0:
            raise PricingCalculationError(
                f"No list price found for {glass_type} ({manufacturer})"
            )

        # 3. Fetch Shop and Config
        try:
            shop = Shop.objects.get(id=shop_id)
        except Shop.DoesNotExist:
            raise PricingCalculationError(f"Shop {shop_id} not found.")

        config = PricingConfig.get_instance()

        # 3. Find applicable pricing rule
        # We need to find a rule that matches the shop and is currently valid
        rule = self._find_best_pricing_rule(shop, manufacturer, glass_type)

        if rule:
            final_part_price = rule.calculate_price(list_price)
            discount_info = {
                "applied_rule": rule.name,
                "strategy": rule.pricing_strategy,
                "original_price": list_price,
                "discount_amount": list_price - final_part_price,
            }
        else:
            # Fallback to default markup if no specific rule found
            self.log_warning(
                f"No pricing rule found for shop {shop_id}, using defaults"
            )

            # Apply global markup from config if no rule
            final_part_price = list_price * config.markup_multiplier
            discount_info = {
                "applied_rule": "Global Markup",
                "strategy": "markup",
                "original_price": list_price,
                "markup_multiplier": config.markup_multiplier,
            }

        # 5. Calculate Labor
        # Determine complexity (mock logic: luxury makes = complex)
        luxury_makes = ["Mercedes-Benz", "BMW", "Audi", "Lexus", "Tesla", "Porsche"]
        is_complex = vehicle_data.get("make") in luxury_makes

        labor_rate = (
            config.complex_labor_rate if is_complex else config.standard_labor_rate
        )
        labor_cost = labor_rate  # Flat rate for now per job

        # 6. Calculate Fees
        fees = []

        # Environmental & Disposal
        fees.append({"name": "Environmental Fee", "amount": config.environmental_fee})
        fees.append({"name": "Disposal Fee", "amount": config.disposal_fee})

        # Mobile Fee
        mobile_fee = Decimal("0.00")
        if service_type == "mobile":
            if distance_miles is not None:
                calc_fee = config.calculate_mobile_fee(distance_miles)
                if calc_fee is not None:
                    mobile_fee = calc_fee
                    fees.append({"name": "Mobile Service Fee", "amount": mobile_fee})
                else:
                    # Too far
                    raise PricingCalculationError(
                        f"Distance {distance_miles} miles is beyond service radius."
                    )
            else:
                # If distance not provided but mobile requested,
                # maybe use Tier 1 as estimate?
                # Or raise error. Let's use Tier 1 for estimate.
                mobile_fee = config.mobile_fee_tier_1_amount
                fees.append({"name": "Mobile Service Fee (Est)", "amount": mobile_fee})

        # 7. Sum Totals
        total_fees = sum(f["amount"] for f in fees)
        subtotal = final_part_price + labor_cost + total_fees
        tax = Decimal("0.00")  # Tax logic can be complex, 0 for MVP
        total = subtotal + tax

        # 8. Insurance Logic
        insurance_info = {}
        if payment_type == "insurance" and insurance_provider_id:
            try:
                provider = InsuranceProvider.objects.get(id=insurance_provider_id)
                # Insurance might have its own pricing (e.g. markup on NAGS)
                # For MVP, let's just record it.
                insurance_info = {
                    "provider": provider.name,
                    "requires_approval": provider.requires_pre_approval,
                }
                # If provider has custom markup, maybe we should
                # have used that instead of shop rule?
                # Keeping it simple: Shop price is what we charge,
                # Insurance pays it.
            except InsuranceProvider.DoesNotExist:
                pass

        # Construct Response
        return {
            "vehicle": vehicle_data,
            "glass": {
                "type": glass_type,
                "part_number": selected_part.get("nags_id"),  # or generic
                "description": selected_part.get("description"),
            },
            "shop": {
                "id": shop.id,
                "name": shop.name,
            },
            "pricing_breakdown": {
                "part_cost": round(final_part_price, 2),
                "labor_cost": round(labor_cost, 2),
                "fees": fees,
                "subtotal": round(subtotal, 2),
                "tax": round(tax, 2),
                "total": round(total, 2),
                "discount_info": discount_info,
            },
            "line_items": self._build_line_items(
                final_part_price, labor_cost, fees, selected_part
            ),
            "insurance_info": insurance_info,
        }

    def _find_best_pricing_rule(
        self, shop: Shop, manufacturer: str, glass_type: str
    ) -> Optional[ShopPricingRule]:
        """
        Finds the most applicable pricing rule for the shop.
        Prioritizes specific glass type rules over general ones.
        """
        # now = timezone.now() # Unused for now as we rely on seeded data validity

        # 1. Try specific glass type rule
        rules = (
            ShopPricingRule.objects.filter(
                shop=shop,
                manufacturer__iexact=manufacturer,
                glass_type=glass_type,
                is_active=True,
            )
            .filter(
                # Valid date range
                # (valid_from <= now OR null) AND (valid_until >= now OR null)
                # Django Q objects would be better here but keeping it simple
            )
            .order_by("-priority")
        )

        # Filter dates in python if complex query needed or just use simple filter
        # Let's rely on the fact we seeded valid rules.

        for rule in rules:
            if rule.is_valid_now():
                return rule

        # 2. Try general rule (no glass type specified)
        rules = ShopPricingRule.objects.filter(
            shop=shop,
            manufacturer__iexact=manufacturer,
            glass_type__isnull=True,  # or empty string
            is_active=True,
        ).order_by("-priority")

        for rule in rules:
            if rule.is_valid_now():
                return rule

        return None

    def _build_line_items(
        self,
        part_price: Decimal,
        labor_price: Decimal,
        fees: List[Dict],
        part_data: Dict,
    ) -> List[Dict]:
        """
        Helper to build standardized line items list.
        """
        items = []

        # Part
        items.append(
            {
                "type": "part",
                "description": (
                    f"Glass Part: "
                    f"{part_data.get('description', 'Replacement Glass')}"
                ),
                "unit_price": round(part_price, 2),
                "quantity": 1,
                "subtotal": round(part_price, 2),
            }
        )

        # Labor
        items.append(
            {
                "type": "labor",
                "description": "Installation Labor",
                "unit_price": round(labor_price, 2),
                "quantity": 1,
                "subtotal": round(labor_price, 2),
            }
        )

        # Fees
        for fee in fees:
            items.append(
                {
                    "type": "fee",
                    "description": fee["name"],
                    "unit_price": round(fee["amount"], 2),
                    "quantity": 1,
                    "subtotal": round(fee["amount"], 2),
                }
            )

        return items
