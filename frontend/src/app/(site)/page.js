import ProductList from "@/components/ProductList";
import News from "@/components/News";
import Reviews from "@/components/Reviews";
import Subscribe from "@/components/Subscribe";
import FeatureStrip from "@/components/FeatureStrip";
import CategoryCards from "@/components/CategoryCards";
import ProductSale from "@/components/ProductSales";
import NewProducts from "@/components/NewProducts";
import AllProducts from "@/components/AllProducts";
import CouponBanner from "@/components/CouponBanner";

export default function Home() {
  return (
    <>
      <CouponBanner />
      <FeatureStrip />
      <CategoryCards />
      <ProductSale />
      <ProductList />
      <NewProducts />
      <AllProducts />
      <News />
      <Reviews />
      <Subscribe />
    </>
  );
}
