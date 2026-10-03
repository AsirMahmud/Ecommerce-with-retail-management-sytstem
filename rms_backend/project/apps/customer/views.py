import csv
import io
import re
from datetime import datetime, timedelta
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Count, Max, Q
from django.http import HttpResponse
from .models import Customer
from .serializers import CustomerSerializer, TopCustomerSerializer

class CustomerPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class CustomerViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing customer operations.
    Provides CRUD operations, CSV import, template export, and additional filtering capabilities.
    """
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    pagination_class = CustomerPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['gender', 'is_active']
    search_fields = ['first_name', 'last_name', 'email', 'phone']
    ordering_fields = ['created_at', 'first_name', 'last_name', 'ranking', 'total_sales', 'sales_count', 'last_sale_date']
    ordering = ['-created_at']

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('no_pagination') == 'true':
            return None
        return super().paginate_queryset(queryset)

    def get_queryset(self):
        """Override to add ranking calculation and filtering"""
        # Start with base queryset
        queryset = Customer.objects.all()
        
        # Apply ranking calculation first
        queryset = queryset.annotate(
            total_sales=Sum('sale__total', filter=Q(sale__status='completed'))
        ).order_by('-total_sales')
        
        # Update rankings for all customers
        for rank, customer in enumerate(queryset, 1):
            if customer.ranking != rank:
                customer.ranking = rank
                customer.save(update_fields=['ranking'])
        
        # Start fresh queryset for filtering
        queryset = Customer.objects.all()
        
        # Apply search filter first (if search parameter is provided)
        search_query = self.request.query_params.get('search', None)
        if search_query:
            queryset = queryset.filter(
                Q(first_name__icontains=search_query) |
                Q(last_name__icontains=search_query) |
                Q(email__icontains=search_query) |
                Q(phone__icontains=search_query)
            )
        
        # Apply customer_type filter (shop, online, both)
        customer_type = self.request.query_params.get('customer_type', None)
        if customer_type:
            if customer_type == 'shop':
                queryset = queryset.filter(Q(customer_type='shop') | Q(customer_type='both'))
            elif customer_type == 'online':
                queryset = queryset.filter(Q(customer_type='online') | Q(customer_type='both'))
            else:
                queryset = queryset.filter(customer_type=customer_type)

        # Apply additional filtering based on query parameters
        ranking_filter = self.request.query_params.get('ranking_filter', None)
        if ranking_filter:
            if ranking_filter == 'top-20':
                queryset = queryset.filter(ranking__lte=20)
            elif ranking_filter == 'top-30':
                queryset = queryset.filter(ranking__lte=30)
            elif ranking_filter == 'top-50':
                queryset = queryset.filter(ranking__lte=50)
            elif ranking_filter == 'top-100':
                queryset = queryset.filter(ranking__lte=100)
        
        # Filter by sales value
        sales_filter = self.request.query_params.get('sales_filter', None)
        if sales_filter:
            if sales_filter == 'high-value':
                queryset = queryset.annotate(
                    total_sales=Sum('sale__total', filter=Q(sale__status='completed'))
                ).filter(total_sales__gt=1000)
            elif sales_filter == 'low-value':
                queryset = queryset.annotate(
                    total_sales=Sum('sale__total', filter=Q(sale__status='completed'))
                ).filter(total_sales__lt=100)
        
        # Filter by recent activity
        recent_filter = self.request.query_params.get('recent_filter', None)
        if recent_filter == 'recent':
            thirty_days_ago = datetime.now() - timedelta(days=30)
            queryset = queryset.filter(
                sale__date__gte=thirty_days_ago,
                sale__status='completed'
            ).distinct()
        
        return queryset

    def perform_create(self, serializer):
        """Override to add any additional logic during customer creation"""
        serializer.save()

    @action(detail=False, methods=['get'])
    def active_customers(self, request):
        """Custom action to get only active customers"""
        active_customers = Customer.objects.filter(is_active=True)
        page = self.paginate_queryset(active_customers)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(active_customers, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def inactive_customers(self, request):
        """Custom action to get only inactive customers"""
        inactive_customers = Customer.objects.filter(is_active=False)
        page = self.paginate_queryset(inactive_customers)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(inactive_customers, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def top_customers(self, request):
        """Get top customers by total sales"""
        limit = int(request.query_params.get('limit', 5))
        top_customers = Customer.objects.annotate(
            total_sales=Sum('sale__total', filter=Q(sale__status='completed'))
        ).filter(
            total_sales__gt=0
        ).order_by('-total_sales')[:limit]
        
        serializer = TopCustomerSerializer(top_customers, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def customer_analytics(self, request):
        """Get customer analytics and statistics"""
        total_customers = Customer.objects.count()
        active_customers = Customer.objects.filter(is_active=True).count()
        shop_customers = Customer.objects.filter(Q(customer_type='shop') | Q(customer_type='both')).count()
        online_customers = Customer.objects.filter(Q(customer_type='online') | Q(customer_type='both')).count()
        
        # Get top customers for analysis
        top_customers = Customer.objects.annotate(
            total_sales=Sum('sale__total', filter=Q(sale__status='completed'))
        ).filter(
            total_sales__gt=0
        ).order_by('-total_sales')[:5]
        
        # Calculate average order value
        total_sales = Customer.objects.aggregate(
            total=Sum('sale__total', filter=Q(sale__status='completed'))
        )['total'] or 0
        
        total_orders = Customer.objects.aggregate(
            count=Count('sale', filter=Q(sale__status='completed'))
        )['count'] or 0
        
        average_order_value = total_sales / total_orders if total_orders > 0 else 0
        
        # Calculate due amounts
        total_due_amount = Customer.objects.aggregate(
            total=Sum('sale__amount_due', filter=Q(sale__amount_due__gt=0))
        )['total'] or 0
        
        # Calculate average discount
        total_discount = Customer.objects.aggregate(
            total=Sum('sale__discount', filter=Q(sale__status='completed'))
        )['total'] or 0
        
        average_discount = (total_discount / total_sales * 100) if total_sales > 0 else 0
        
        analytics = {
            'total_customers': total_customers,
            'active_customers': active_customers,
            'inactive_customers': total_customers - active_customers,
            'shop_customers': shop_customers,
            'online_customers': online_customers,
            'total_sales': total_sales,
            'total_orders': total_orders,
            'average_order_value': average_order_value,
            'total_due_amount': total_due_amount,
            'average_discount': average_discount,
            'top_customers': TopCustomerSerializer(top_customers, many=True).data
        }
        
        return Response(analytics)

    @action(detail=False, methods=['get'])
    def export_data(self, request):
        """
        Fast JSON export endpoint for customers directory.
        Supports search, customer_type, ranking_filter, sales_filter, recent_filter, ordering.
        """
        queryset = self.filter_queryset(self.get_queryset())
        annotated_qs = queryset.annotate(
            total_sales_val=Sum('sale__total', filter=Q(sale__status='completed')),
            sales_count_val=Count('sale', filter=Q(sale__status='completed')),
            last_sale_date_val=Max('sale__date', filter=Q(sale__status='completed'))
        )

        data = []
        for c in annotated_qs:
            data.append({
                'id': c.id,
                'ranking': c.ranking,
                'first_name': c.first_name or '',
                'last_name': c.last_name or '',
                'name': f"{c.first_name or ''} {c.last_name or ''}".strip() or "Customer",
                'phone': c.phone or '',
                'email': c.email or '',
                'address': c.address or '',
                'gender': c.gender or '',
                'date_of_birth': c.date_of_birth.isoformat() if c.date_of_birth else None,
                'customer_type': c.customer_type or 'shop',
                'is_active': c.is_active,
                'total_sales': float(c.total_sales_val or 0.0),
                'sales_count': int(c.sales_count_val or 0),
                'last_sale_date': c.last_sale_date_val.isoformat() if c.last_sale_date_val else None,
                'created_at': c.created_at.isoformat() if c.created_at else None,
            })

        return Response(data)

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """
        Export filtered customers directly as downloadable CSV file.
        Supports format='meta' to output Facebook/Meta Custom Audience Value-Based template.
        """
        queryset = self.filter_queryset(self.get_queryset())
        annotated_qs = queryset.annotate(
            total_sales_val=Sum('sale__total', filter=Q(sale__status='completed')),
            sales_count_val=Count('sale', filter=Q(sale__status='completed')),
            last_sale_date_val=Max('sale__date', filter=Q(sale__status='completed'))
        )

        export_type = (
            request.query_params.get('template') or 
            request.query_params.get('export_type') or 
            request.query_params.get('mode') or 
            ''
        ).lower()

        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')

        if export_type in ['meta', 'meta_audience', 'value_based']:
            filename = f"meta_custom_audience_value_based_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'

            writer = csv.writer(response)
            # Exact Meta Custom Audience header
            writer.writerow([
                'email', 'email', 'email',
                'phone', 'phone', 'phone',
                'madid', 'fn', 'ln',
                'zip', 'ct', 'st', 'country',
                'dob', 'doby', 'gen', 'age',
                'uid', 'value'
            ])

            today = datetime.now().date()
            for c in annotated_qs:
                dob_str = c.date_of_birth.strftime('%m/%d/%y') if c.date_of_birth else ''
                doby_str = str(c.date_of_birth.year) if c.date_of_birth else ''
                age_str = ''
                if c.date_of_birth:
                    age = today.year - c.date_of_birth.year - ((today.month, today.day) < (c.date_of_birth.month, c.date_of_birth.day))
                    age_str = str(age) if age >= 0 else ''

                val_str = f"{float(c.total_sales_val or 0):.2f}"
                phone_raw = str(c.phone or '').strip()
                phone_clean = re.sub(r'[^\d+]', '', phone_raw)
                if phone_clean and not phone_clean.startswith('+'):
                    if phone_clean.startswith('01'):
                        phone_clean = f"+88{phone_clean}"
                    elif phone_clean.startswith('880'):
                        phone_clean = f"+{phone_clean}"

                writer.writerow([
                    c.email or '', '', '',
                    phone_clean, '', '',
                    '', # madid
                    c.first_name or '',
                    c.last_name or '',
                    '', '', '', 'BD', # zip, ct, st, country
                    dob_str,
                    doby_str,
                    c.gender or '',
                    age_str,
                    c.id,
                    val_str
                ])

            return response

        # Standard CRM human-readable report
        filename = f"customers_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow([
            'Rank',
            'First Name',
            'Last Name',
            'Phone',
            'Email',
            'Channel',
            'Total Sales (BDT)',
            'Orders Count',
            'Last Purchase Date',
            'Status'
        ])

        for c in annotated_qs:
            last_date_str = c.last_sale_date_val.strftime('%Y-%m-%d') if c.last_sale_date_val else 'No sales'
            ch_label = 'Online' if c.customer_type == 'online' else 'Both' if c.customer_type == 'both' else 'Offline (Shop)'
            writer.writerow([
                c.ranking or '-',
                c.first_name or '',
                c.last_name or '',
                c.phone or '',
                c.email or '',
                ch_label,
                f"{float(c.total_sales_val or 0):.2f}",
                c.sales_count_val or 0,
                last_date_str,
                'Active' if c.is_active else 'Inactive'
            ])

        return response

    @action(detail=False, methods=['get'])
    def download_template(self, request):
        """Return CSV template formatted according to the Meta/standard customer import specifications"""
        template_content = (
            "email,email,email,phone,phone,phone,madid,fn,ln,zip,ct,st,country,dob,doby,gen,age,uid,value\r\n"
            "elizabetho@fb.com,olsene@fb.com,eolsen@fb.com,1-(650)-561-5622,1-(650)-782-5622,1-(650)-888-5622,aece52e7-03ee-455a-b3c4-e57283966239,Elizabeth,Olsen,94046,Menlo Park,CA,US,10/21/68,1968,F,48,1234567890,20.1\r\n"
            "andrewj@fb.com,jamisona@fb.com,ajamison@fb.com,1-(212) 736-3100,1-(212) 523-3100,1-(212) 123-3100,BEBE52E7-03EE-455A-B3C4-E57283966239,Andrew,Jamison,10118,New York,NY,US,10/17/78,1978,M,38,1443637309,1342.8\r\n"
            "margaretj@fb.com,johnsonm@fb.com,mjohnson@fb.com,1-(323) 857-6000,1-(323) 617-6000,1-(323) 543-6000,adbe52e7-03ee-455a-b3c4-e57283966239,Margaret,Johnson,90001-4656,Los Angeles,CA,US,11/21/82,1982,F,33,1234567892,600\r\n"
            "johnd@fb.com,doej@fb.com,jdoe@fb.com,1-(312) 443-3600,1-(312) 555-3600,1-(312) 321-3600,aebe52e7-03ee-455a-b3c4-e57283966239,John,Doe,60603,Chicago,IL,US,9/1/78,1978,M,38,1234567890,505\r\n"
            "marks@fb.com,smithmark@fb.com,msmith@fb.com,+44 303 123 7300,+44 871 663 1678,+44 844 412 4653,AEBD52E7-03EE-455A-B3C4-E57283966239,Mark,Smith,SW1A 1AA,London,,GB,12/10/78,1978,M,38,1443637309,3123\r\n"
            "jamesm@fb.com,mclaughlinj@fb.com,jmclaughlin@fb.com,+44 20 7219 4272,+44 844 482 5138,+44 343 222 1234,aece52e7-03ee-455a-b3c4-e57283966239,James,McLaughlin,SW1A 1AA,London,,GB,10/21/56,1978,M,50,1234567892,456.9\r\n"
            "pauloa@fb.com,alessandrop@fb.com,palessandro@fb.com,+55 21 3938-6900,+55 11 3091-3116,+55 11 3113-3651,ACBE52E7-03EE-455A-B3C4-E57283966239,Paulo,Alessandro,01310-200,Sao Paulo,,BR,12/21/78,1976,M,40,1234567890,60\r\n"
            "mariel@fb.com,laurentm@fb.com,mlaurent@fb.com,+33 892 70 12 39,+33 1 53 09 82 82,+33 1 40 20 53 17,AFCE52E7-03EE-455A-B3C4-E57283966239,Marie,Laurent,75007,Paris,,FR,10/10/65,1978,F,51,1443637309,77\r\n"
            "thomasd@fb.com,duboist@fb.com,tdubois@fb.com,+33 892 70 12 39,+33 1 49 52 42 63,+33 1 42 96 70 00,aebe52e7-03ee-455a-b3c4-e57283966239,Thomas,Dubois,75007,Paris,,FR,11/19/72,1978,M,44,1234567892,590\r\n"
        )
        response = HttpResponse(template_content, content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="customer_import_template.csv"'
        return response

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser, JSONParser])
    def import_csv(self, request):
        """
        Import customers from CSV file or parsed JSON data.
        Supports Facebook/Meta Custom Audience CSV template and standard CSVs.
        """
        uploaded_file = request.FILES.get('file')
        raw_text = request.data.get('csv_text')
        json_rows = request.data.get('rows')
        target_customer_type = request.data.get('customer_type', 'shop')
        if target_customer_type not in ['shop', 'online', 'both']:
            target_customer_type = 'shop'

        rows = []
        if uploaded_file:
            try:
                file_content = uploaded_file.read()
                try:
                    text = file_content.decode('utf-8-sig')
                except UnicodeDecodeError:
                    text = file_content.decode('latin-1')
                csv_reader = csv.reader(io.StringIO(text))
                rows = list(csv_reader)
            except Exception as e:
                return Response({'error': f'Failed to parse uploaded CSV: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
        elif raw_text:
            try:
                csv_reader = csv.reader(io.StringIO(raw_text))
                rows = list(csv_reader)
            except Exception as e:
                return Response({'error': f'Failed to parse CSV text: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
        elif json_rows and isinstance(json_rows, list):
            rows = json_rows
        else:
            return Response({'error': 'No CSV file, text, or rows provided'}, status=status.HTTP_400_BAD_REQUEST)

        if not rows or len(rows) < 2:
            return Response({'error': 'CSV contains no data rows'}, status=status.HTTP_400_BAD_REQUEST)

        header = [str(col).strip().lower() for col in rows[0]]
        
        # Identify indices with flexible matching
        email_indices = [i for i, h in enumerate(header) if any(k in h for k in ('email', 'e-mail', 'mail'))]
        phone_indices = [i for i, h in enumerate(header) if any(k in h for k in ('phone', 'mobile', 'cell', 'contact', 'tel'))]
        fn_indices = [i for i, h in enumerate(header) if any(k in h for k in ('fn', 'first_name', 'firstname', 'customer_name', 'client_name', 'full_name')) or h == 'name']
        ln_indices = [i for i, h in enumerate(header) if any(k in h for k in ('ln', 'last_name', 'lastname', 'surname'))]
        zip_indices = [i for i, h in enumerate(header) if h in ('zip', 'zipcode', 'zip_code', 'postal_code', 'postcode')]
        ct_indices = [i for i, h in enumerate(header) if h in ('ct', 'city', 'town')]
        st_indices = [i for i, h in enumerate(header) if h in ('st', 'state', 'province', 'division')]
        country_indices = [i for i, h in enumerate(header) if h in ('country', 'country_code')]
        dob_indices = [i for i, h in enumerate(header) if h in ('dob', 'date_of_birth', 'birthdate')]
        doby_indices = [i for i, h in enumerate(header) if h in ('doby', 'birth_year', 'year_of_birth')]
        gen_indices = [i for i, h in enumerate(header) if h in ('gen', 'gender', 'sex')]
        val_indices = [i for i, h in enumerate(header) if h in ('value', 'clv', 'total_spent')]
        uid_indices = [i for i, h in enumerate(header) if h in ('uid', 'user_id', 'customer_id', 'id')]
        madid_indices = [i for i, h in enumerate(header) if h in ('madid', 'mobile_ad_id')]
        addr_indices = [i for i, h in enumerate(header) if h in ('address', 'street', 'address_line_1')]

        def parse_phone(raw):
            if not raw:
                return ""
            s = str(raw).strip()
            if not s:
                return ""
            # Strip Meta's p: or p:+ prefix
            if s.lower().startswith('p:'):
                s = s[2:].strip()
            has_plus = s.startswith('+')
            digits = re.sub(r'\D', '', s)
            if not digits:
                return ""
            if has_plus:
                res = f"+{digits}"
            elif len(digits) == 11 and digits.startswith('1'):
                res = f"+{digits}"
            elif digits.startswith('880') and len(digits) >= 13:
                res = f"+{digits}"
            else:
                res = digits
            return res[:15]

        def parse_date(dob_str, doby_str):
            if dob_str:
                s = str(dob_str).strip()
                for fmt in ('%m/%d/%y', '%m/%d/%Y', '%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%Y/%m/%d'):
                    try:
                        d = datetime.strptime(s, fmt)
                        if d.year > datetime.now().year:
                            d = d.replace(year=d.year - 100)
                        return d.date()
                    except ValueError:
                        pass
            if doby_str:
                s = str(doby_str).strip()
                if s.isdigit() and len(s) == 4:
                    try:
                        return datetime(year=int(s), month=1, day=1).date()
                    except ValueError:
                        pass
            return None

        def parse_gen(gen_str):
            if not gen_str:
                return ''
            s = str(gen_str).strip().upper()
            if s.startswith('M'):
                return 'M'
            elif s.startswith('F'):
                return 'F'
            elif s.startswith('O'):
                return 'O'
            return ''

        created_count = 0
        updated_count = 0
        skipped_count = 0
        errors = []

        data_rows = rows[1:]
        for idx, row in enumerate(data_rows, start=2):
            if not row or not any(str(c).strip() for c in row):
                continue
            
            try:
                # 1. Emails
                email = None
                for e_idx in email_indices:
                    if e_idx < len(row):
                        candidate = str(row[e_idx]).strip().lower()
                        if candidate and '@' in candidate and '.' in candidate:
                            email = candidate
                            break

                # 2. Phones
                phone = ""
                for p_idx in phone_indices:
                    if p_idx < len(row):
                        candidate_phone = parse_phone(row[p_idx])
                        if candidate_phone:
                            phone = candidate_phone
                            break

                # 3. Names
                fn = ""
                for f_idx in fn_indices:
                    if f_idx < len(row) and str(row[f_idx]).strip():
                        fn = str(row[f_idx]).strip()
                        break
                
                ln = ""
                for l_idx in ln_indices:
                    if l_idx < len(row) and str(row[l_idx]).strip():
                        ln = str(row[l_idx]).strip()
                        break

                # If full name in fn but ln is empty
                if fn and not ln and ' ' in fn:
                    parts = fn.split(' ', 1)
                    fn = parts[0]
                    ln = parts[1]

                # 4. Address
                addr_parts = []
                for a_idx in addr_indices:
                    if a_idx < len(row) and str(row[a_idx]).strip():
                        addr_parts.append(str(row[a_idx]).strip())
                for c_idx in ct_indices:
                    if c_idx < len(row) and str(row[c_idx]).strip():
                        addr_parts.append(str(row[c_idx]).strip())
                for s_idx in st_indices:
                    if s_idx < len(row) and str(row[s_idx]).strip():
                        addr_parts.append(str(row[s_idx]).strip())
                for z_idx in zip_indices:
                    if z_idx < len(row) and str(row[z_idx]).strip():
                        addr_parts.append(str(row[z_idx]).strip())
                for co_idx in country_indices:
                    if co_idx < len(row) and str(row[co_idx]).strip():
                        addr_parts.append(str(row[co_idx]).strip())
                address = ", ".join(dict.fromkeys(addr_parts))

                # 5. Gender
                gender = ''
                for g_idx in gen_indices:
                    if g_idx < len(row) and str(row[g_idx]).strip():
                        gender = parse_gen(row[g_idx])
                        if gender:
                            break

                # 6. Date of birth
                dob_val = None
                for d_idx in dob_indices:
                    if d_idx < len(row) and str(row[d_idx]).strip():
                        dob_val = str(row[d_idx]).strip()
                        break
                doby_val = None
                for dy_idx in doby_indices:
                    if dy_idx < len(row) and str(row[dy_idx]).strip():
                        doby_val = str(row[dy_idx]).strip()
                        break
                date_of_birth = parse_date(dob_val, doby_val)

                # 7. Metadata / Notes (UID, MADID, Value)
                meta_notes = []
                for u_idx in uid_indices:
                    if u_idx < len(row) and str(row[u_idx]).strip():
                        meta_notes.append(f"UID: {str(row[u_idx]).strip()}")
                        break
                for m_idx in madid_indices:
                    if m_idx < len(row) and str(row[m_idx]).strip():
                        meta_notes.append(f"MADID: {str(row[m_idx]).strip()}")
                        break
                for v_idx in val_indices:
                    if v_idx < len(row) and str(row[v_idx]).strip():
                        meta_notes.append(f"Value: ${str(row[v_idx]).strip()}")
                        break
                extra_note = " | ".join(meta_notes)

                # Ensure phone exists or generate a valid placeholder phone
                if not phone:
                    if email:
                        # Fallback phone based on hash
                        pseudo_digits = ''.join(c for c in str(abs(hash(email))) if c.isdigit())[:9].ljust(9, '0')
                        phone = f"+999{pseudo_digits}"[:15]
                    else:
                        errors.append(f"Row {idx}: Skipped (neither valid phone nor email provided)")
                        skipped_count += 1
                        continue

                # Database matching
                existing = None
                if phone:
                    last_10 = phone[-10:] if len(phone) >= 10 else phone
                    existing = Customer.objects.filter(
                        Q(phone=phone) | Q(phone__endswith=last_10)
                    ).first()
                if not existing and email:
                    existing = Customer.objects.filter(email__iexact=email).first()

                if existing:
                    # Update customer type
                    if existing.customer_type != target_customer_type and existing.customer_type != 'both':
                        existing.customer_type = 'both'
                    elif target_customer_type == 'both':
                        existing.customer_type = 'both'

                    # Update missing details
                    if not existing.first_name and fn:
                        existing.first_name = fn
                    if not existing.last_name and ln:
                        existing.last_name = ln
                    if not existing.email and email:
                        if not Customer.objects.filter(email__iexact=email).exclude(id=existing.id).exists():
                            existing.email = email
                    if not existing.address and address:
                        existing.address = address
                    if not existing.gender and gender:
                        existing.gender = gender
                    if not existing.date_of_birth and date_of_birth:
                        existing.date_of_birth = date_of_birth
                    if extra_note and not existing.fake_notes:
                        existing.fake_notes = extra_note
                    existing.save()
                    updated_count += 1
                else:
                    save_email = email
                    if save_email and Customer.objects.filter(email__iexact=save_email).exists():
                        save_email = None

                    try:
                        from django.db import IntegrityError
                        Customer.objects.create(
                            first_name=fn or (email.split('@')[0] if email else "Customer"),
                            last_name=ln,
                            phone=phone,
                            email=save_email,
                            address=address,
                            gender=gender,
                            date_of_birth=date_of_birth,
                            customer_type=target_customer_type,
                            fake_notes=extra_note or None,
                            is_active=True
                        )
                        created_count += 1
                    except IntegrityError:
                        # Fallback if phone already exists
                        existing = Customer.objects.filter(phone=phone).first()
                        if existing:
                            if target_customer_type in ['both', 'online'] and existing.customer_type != target_customer_type:
                                existing.customer_type = 'both'
                                existing.save(update_fields=['customer_type'])
                            updated_count += 1
                        else:
                            skipped_count += 1

            except Exception as row_err:
                errors.append(f"Row {idx}: {str(row_err)}")
                skipped_count += 1

        return Response({
            'success': True,
            'message': f"Import complete: {created_count} created, {updated_count} updated, {skipped_count} skipped.",
            'created_count': created_count,
            'updated_count': updated_count,
            'skipped_count': skipped_count,
            'total_rows': len(data_rows),
            'errors': errors[:50]
        }, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        """Override to implement soft delete"""
        customer = self.get_object()
        customer.is_active = False
        customer.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
